var express = require('express');
var mustache = require('mustache-express');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const axios = require('axios');
var model = require('./model');
var app = express();
app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', './views');
app.use(express.static('./views/images'));
app.use(express.static('./views/css'));

const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

const secret = crypto.randomBytes(32).toString('hex');
const api_key = 'e49d6088a7c6032be073e1e136e761fa';

const cloudinary = require('cloudinary').v2;

cloudinary.config({
    cloud_name: 'dcktbp159',
    api_key: '527681711682353',
    api_secret: 'jTjVULtJ63B9kioQW-vTVz0gmfU',
});

const multer = require('multer');
const upload = multer({ dest: 'uploads/' });



app.use(cookieSession({
    secret: secret,
}));



function is_authenticated(req, res, next) {
    if (req.session && req.session.userid) {

        res.locals.authenticated = true;
        res.locals.username = req.session.username;
        res.locals.id = req.session.userid;
    } else {
        res.locals.authenticated = false;
        res.locals.name = "";
        res.locals.id = "";
    }
    next();
};

app.use(is_authenticated);


/*PAGE D'ACCEUIL**/
app.get('/', (req, res) => {
    if (!res.locals.authenticated) {
        res.render('index');
    } else {

        res.redirect('/dashboard');
    }
});

/*CREE UN COMPTE**/
app.get('/new_user', (req, res) => {
    res.render('new_user');
});

app.post('/new_user', (req, res) => {
    const username = req.body.username;
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const new_user = model.new_user(username, email, password);
    if (new_user == -1) {
        res.redirect('/new_user?message=Vous avez deja un compte');
    } else {
        req.session.userid = new_user;
        req.session.username = username;
        res.redirect('/');
    }

});

/*SE CONNECTER**/
app.get('/login', (req, res) => {
    if (!res.locals.authenticated) {
        res.render('login');
    } else {
        res.redirect('/dashboard');
    }
});

app.post('/login', (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const user = model.login(email, password);

    if (user == null) {
        res.redirect('/login?message=Nom d\'utilisateur ou mot de passe incorrect.');
    } else {
        req.session.userid = user.id;
        req.session.username = model.getUsername(user.id);
        res.redirect('/dashboard');
    }
});

/*SE DECONNECTER**/
app.get('/logout', (req, res) => {
    req.session = null;
    res.redirect('/');
});

// Route GET "/dashboard"
app.get('/dashboard', async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const userItems = model.get_user_items(res.locals.id);
    const upcomingMovies = await model.get_upcoming_movies();
    const popular = await model.get_popular();
    console.log(popular)


    res.render('dashboard', {
        items: userItems.items,
        upcomingMovies,
        popular,
    });
});

// Route POST "/add"
app.post('/add', async (req, res) => {

    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const { tmdb_id, title, date, poster, type } = req.body;

    const user_id = res.locals.id;
    const item_id = model.add_item(tmdb_id, title, date, poster, type, user_id);

    const item_name = model.get_item(item_id).title;

    if (item_id > 0) {
        res.redirect(`/dashboard?added=${item_name}`);
    } else {
        res.redirect('/dashboard');
    }
});



/*ESPACE UTILISATEUR**/
app.get('/user_space', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const user_id = res.locals.id;
    const user_data = model.get_user_data(user_id);
    res.render('user_space', { email: user_data });
});

/*MODIFIER PROFIL**/

// Route GET "/change_username"
app.get('/change_username', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const user_id = res.locals.id;
    const user_data = model.get_user_data(user_id);
    res.render('change_username', { email: user_data });
});

// Route POST "change_username"
app.post('change_username', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const id = res.locals.id;
    const user_data = get_user_data(id);
    res.render('change_username', { email: user_data });
});

// Route GET "/change_email"
app.get('/change_email', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const user_id = res.locals.id;
    const user_data = model.get_user_data(user_id);
    res.render('change_email', { email: user_data });
});

// Route POST "/change_email"

app.post('/change_email', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const id = res.locals.id;
    const user_data = get_user_data(id);
    res.render('change_email', { email: user_data });
});

// Route GET "/change_password"
app.get('/change_password', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const user_id = res.locals.id;
    const user_data = model.get_user_data(user_id);
    res.render('change_password', { email: user_data });
});

// Route POST "/user_space"

app.post('/change_password', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const id = res.locals.id;
    const user_data = get_user_data(id);
    res.render('change_password', { email: user_data });
});

// Route GET "/anime"
app.get('/anime', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    res.render('anime');
});



// Route POST "/delete/:id"
app.post('/delete/:id', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const item_id = req.params.id;
    const item_name = model.get_item(item_id).title;
    const success = model.delete_item(res.locals.id, item_id);

    if (success) {
        res.redirect(`/dashboard?deleted=${item_name}`);
    } else {
        res.redirect('/dashboard');
    }

});


app.get('/search', async (req, res) => {

    const query = req.query.query;

    if (!query) {
        res.render('search', { results: [] });
        return;
    }

    const apiUrl = `https://api.themoviedb.org/3/search/multi?api_key=${api_key}&language=fr-FR&query=${encodeURIComponent(query)}&region=FR`;

    try {
        const response = await axios.get(apiUrl);
        const results = response.data.results;
        console.log(results)

        res.render('search', { results: results });
    } catch (err) {
        console.error('Error fetching data from TMDB API:', err);
        res.status(500).send('Erreur lors de la récupération des données de l\'API TMDB');
    }
});

app.get('/read/:id', async (req, res) => {
    let apiUrl;

    if (req.query.type === 'movie' || req.query.type === 'Film') {
        apiUrl = `https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${api_key}&language=fr-FR&region=FR`;
    } else if (req.query.type === 'tv' || req.query.type === 'Série' || req.query.type === 'Anime') {
        apiUrl = `https://api.themoviedb.org/3/tv/${req.params.id}?api_key=${api_key}&language=fr-FR&region=FR`;
    } else {
        // Ajoutez une réponse d'erreur si le type n'est pas correct
        res.status(400).send('Type de contenu non pris en charge. Veuillez spécifier "movie", "Film", "tv", "Série" ou "Anime" comme type.');
        return;
    }

    try {
        const response = await axios.get(apiUrl);
        const movie = response.data;
        movie.release_date = req.query.date;

        console.log(movie)

        res.render('read', { movie: movie });
    } catch (err) {
        console.error('Error fetching data from TMDB API:', err);
        res.status(500).send('Erreur lors de la récupération des données de l\'API TMDB');
    }
});




app.listen(3000, () => console.log('listening on http://localhost:3000'));