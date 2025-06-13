const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const axios = require('axios');

const api_key = 'e49d6088a7c6032be073e1e136e761fa';

const pool = mysql.createPool({
    host: '109.234.162.11',
    user: 'xowu0020_planifix',
    password: 'mevpYd-nigwi2-gardoj',
    database: 'xowu0020_planifix'
});

/* -------------------------------------------------
   USER REGISTRATION AND LOGIN
---------------------------------------------------*/
async function userExist(email) {
    const [rows] = await pool.execute('SELECT COUNT(*) AS count FROM user WHERE email = ?', [email]);
    return rows[0].count > 0;
}

exports.new_user = async function (username, email, password) {
    if (await userExist(email)) {
        return -1;
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(password, salt);
    const [result] = await pool.execute(
        'INSERT INTO user (username, email, password) VALUES (?, ?, ?)',
        [username, email, hash]
    );
    return result.affectedRows === 1 ? result.insertId : -2;
};

exports.login = async function (email, password) {
    const [rows] = await pool.execute('SELECT * FROM user WHERE email = ?', [email]);
    const user = rows[0];
    if (!user) {
        return null;
    }
    const passwordMatch = bcrypt.compareSync(password, user.password);
    return passwordMatch ? user : null;
};

exports.getUsername = async function (id) {
    const [rows] = await pool.execute('SELECT username FROM user WHERE id = ?', [id]);
    return rows.length > 0 ? rows[0].username : null;
};

exports.get_user_data = async function (user_id) {
    const [rows] = await pool.execute('SELECT * FROM user WHERE id = ?', [user_id]);
    return rows.length > 0 ? rows[0].email : null;
};

exports.update_username = async function (user_id, new_username, password) {
    const [rows] = await pool.execute('SELECT * FROM user WHERE id = ?', [user_id]);
    const user = rows[0];
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
        return 'wrong_password';
    }
    await pool.execute('UPDATE user SET username = ? WHERE id = ?', [new_username, user_id]);
    return 'change_successfully';
};

exports.update_email = async function (user_id, new_email, confirm_new_email, password) {
    const [rows] = await pool.execute('SELECT * FROM user WHERE id = ?', [user_id]);
    const user = rows[0];
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
        return 'wrong_password';
    }
    if (new_email !== confirm_new_email) {
        return 'emails_not_match';
    }
    if (await userExist(new_email)) {
        return 'email_unavailable';
    }
    await pool.execute('UPDATE user SET email = ? WHERE id = ?', [new_email, user_id]);
    return 'change_successfully';
};

exports.update_password = async function (user_id, password, new_password, confirm_new_password) {
    const [rows] = await pool.execute('SELECT * FROM user WHERE id = ?', [user_id]);
    const user = rows[0];
    const passwordMatch = bcrypt.compareSync(password, user.password);
    if (!passwordMatch) {
        return 'wrong_password';
    }
    if (new_password !== confirm_new_password) {
        return 'passwords_not_match';
    }
    const salt = bcrypt.genSaltSync(10);
    const hash = bcrypt.hashSync(new_password, salt);
    await pool.execute('UPDATE user SET password = ? WHERE id = ?', [hash, user_id]);
    return 'change_successfully';
};

/* -------------------------------------------------
   ITEM MANAGEMENT
---------------------------------------------------*/
exports.add_item = async function (tmdb_id, title, date, poster, type, user_id) {
    const [existing] = await pool.execute('SELECT * FROM item WHERE tmdb_id = ?', [tmdb_id]);
    let item_id;
    if (existing.length > 0) {
        item_id = existing[0].id;
    } else {
        const [result] = await pool.execute(
            'INSERT INTO item (tmdb_id, title, date, poster, type) VALUES (?, ?, ?, ?, ?)',
            [tmdb_id, title, date, poster, type]
        );
        if (result.affectedRows !== 1) {
            return -1;
        }
        item_id = result.insertId;
    }
    await addUserItem(user_id, item_id);
    return item_id;
};

exports.update_item = async function (item_id, item) {
    const [result] = await pool.execute(
        'UPDATE item SET tmdb_id = ?, title = ?, date = ?, poster = ?, type = ? WHERE id = ?',
        [item.tmdb_id, item.title, item.date, item.poster, item.type, item_id]
    );
    return result.affectedRows === 1;
};

exports.delete_item = async function (user_id, item_id) {
    const [info] = await pool.execute('DELETE FROM user_item WHERE user_id = ? AND item_id = ?', [user_id, item_id]);
    const [used] = await pool.execute('SELECT COUNT(*) AS count FROM user_item WHERE item_id = ?', [item_id]);
    if (used[0].count === 0) {
        await pool.execute('DELETE FROM item WHERE id = ?', [item_id]);
    }
    return info.affectedRows === 1;
};

exports.get_item = async function (item_id) {
    const [rows] = await pool.execute('SELECT * FROM item WHERE id = ?', [item_id]);
    return rows[0];
};

exports.get_user_items = async function (user_id) {
    const [items] = await pool.execute(
        'SELECT item.* FROM item JOIN user_item ON item.id = user_item.item_id WHERE user_item.user_id = ? ORDER BY item.date ASC',
        [user_id]
    );
    return { items };
};

async function addUserItem(user_id, item_id) {
    const [existingRelation] = await pool.execute(
        'SELECT * FROM user_item WHERE user_id = ? AND item_id = ?',
        [user_id, item_id]
    );
    if (existingRelation.length > 0) {
        return false;
    }
    const [result] = await pool.execute(
        'INSERT INTO user_item (user_id, item_id) VALUES (?, ?)',
        [user_id, item_id]
    );
    return result.affectedRows === 1;
}

/* -------------------------------------------------
   MOVIE API HELPERS
---------------------------------------------------*/
exports.get_upcoming_movies = async function () {
    const apiUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${api_key}&language=fr-FR&page=1&region=FR`;
    try {
        const response = await axios.get(apiUrl);
        const movies = response.data.results;
        movies.sort((a, b) => (a.release_date < b.release_date ? -1 : a.release_date > b.release_date ? 1 : 0));
        return movies;
    } catch (err) {
        console.error('Error fetching data:', err);
        return [];
    }
};

exports.get_popular = async function () {
    const apiUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${api_key}&language=fr-FR&page=1&region=FR`;
    try {
        const response = await axios.get(apiUrl);
        const movies = response.data.results;
        movies.sort((a, b) => (a.release_date > b.release_date ? -1 : a.release_date < b.release_date ? 1 : 0));
        return movies;
    } catch (err) {
        console.error('Error fetching data:', err);
        return [];
    }
};

