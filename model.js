const Sqlite = require('better-sqlite3');
const db = new Sqlite('db.sqlite');
const bcrypt = require('bcrypt');
const axios = require('axios');
const api_key = 'e49d6088a7c6032be073e1e136e761fa';


//////////////////////////////////////////////////CONNEXION ET INSCRIPTION///////////////////////////////////////////////////

/**CREE UN NOUVEL UTILISATEUR */
exports.new_user = function (username, email, password) {
    if (userExist(email)) {
        return -1;
    } else {
        const salt = bcrypt.genSaltSync(10);
        const hash = bcrypt.hashSync(password, salt);
        const result = db.prepare('INSERT INTO user (username, email, password) VALUES (?, ?, ?)').run(username, email, hash);
        if (result.changes === 1) {
            return result.lastInsertRowid;
        } else {
            return -2;
        }
    }
};


/**SE CONNECTER */
exports.login = function (email, password) {
    const user = db.prepare('SELECT * FROM user WHERE email = ?').get(email);
    if (!user) {
        console.log("L'utilisateur n'existe pas");
        return null;
    }

    const passwordMatch = bcrypt.compareSync(password, user.password);

    if (passwordMatch) {
        console.log("Authentification réussie");
        return user;
    } else {
        console.log("Mot de passe incorrect");
        return null;
    }
};

/**AVOIR LES INFOS DE L'UTILISATEUR */
exports.getUsername = function (id) {
    const result = db.prepare('SELECT username FROM user WHERE id = ?').get(id);
    if (result && result.username) {
        return result.username;
    } else {
        return null;
    }
};

/**VERIFIE SI L'UTILISATEUR A DEJA UN COMPTE AVEC SON MAIL */
function userExist(email) {
    const result = db.prepare('SELECT COUNT(*) as count FROM user WHERE email = ?').get(email);
    return result.count > 0;
};


////////////////////////GESTION DES DONNéES////////////////////////////////////////////////
exports.add_item = function (tmdb_id, title, date, poster, type, user_id) {

    const existingItem = db.prepare('SELECT * FROM item WHERE tmdb_id = ?').get(tmdb_id);

    let item_id;

    if (existingItem) {
        item_id = existingItem.id;
    } else {
        const result = db.prepare('INSERT INTO item (tmdb_id, title, date, poster, type) VALUES (?, ?, ?, ?, ?)').run(tmdb_id, title, date, poster, type);

        if (result.changes !== 1) {
            return -1;
        }

        item_id = result.lastInsertRowid;
    }
    const userItemAdded = addUserItem(user_id, item_id);
    return userItemAdded ? item_id : null;
};


exports.update_item = function (item_id, item) {
    const sql = `UPDATE item SET tmdb_id = ?, title = ?, date = ?, poster = ?, type = ? WHERE id = ?`;
    const result = db.prepare(sql).run(item.tmdb_id, item.title, item.date, item.poster, item.type, item_id);
    return result.changes == 1;
};


exports.delete_item = function (user_id, item_id) {
    const info = db.prepare('DELETE FROM user_item WHERE user_id = ? AND item_id = ?').run(user_id, item_id);
    const used = db.prepare('SELECT * FROM user_item WHERE item_id = ?').run(item_id)
    if(used == undefined){
        const delete_item = db.prepare('DELETE FROM item WHERE id = ?').run(item_id);
    }
    return info.changes == 1;

}

exports.get_item = function (item_id) {
    const item = db.prepare('SELECT * FROM item WHERE id = ?').get(item_id);
    return item
}


exports.get_user_items = function (user_id) {
    const items = db.prepare('SELECT item.* FROM item JOIN user_item ON item.id = user_item.item_id WHERE user_item.user_id = ?').all(user_id);
    return { items: items }
};


exports.get_user_data = function (user_id) {
    const result = db.prepare('SELECT * FROM user WHERE id = ?').get(user_id);
    if (result && result.email) {
        return result.email;
    } else {
        return null;
    }
};



function addUserItem(user_id, item_id) {

    const existingRelation = db.prepare('SELECT * FROM user_item WHERE user_id = ? AND item_id = ?').get(user_id, item_id);

    if (existingRelation) {
        return false;
    } else {
        const result = db.prepare('INSERT INTO user_item (user_id, item_id) VALUES (?, ?)').run(user_id, item_id);
        return result.changes === 1;
    }
}



exports.get_upcoming_movies = async function () {
    const apiUrl = `https://api.themoviedb.org/3/movie/upcoming?api_key=${api_key}&language=fr-FR&page=1&region=FR`;
    try {
        const response = await axios.get(apiUrl);
        return response.data.results;
    } catch (err) {
        console.error('Error fetching data from TMDB API:', err);
        return [];
    }
}

exports.get_recommendations = async function(tmdb_id)  {
    const apiUrl = `https://api.themoviedb.org/3/movie/popular?api_key=${api_key}&language=fr-FR&page=1&region=FR`;
    try {
        const response = await axios.get(apiUrl);
        return response.data.results;
    } catch (err) {
        console.error('Error fetching data from TMDB API:', err);
        return [];
    }
}





