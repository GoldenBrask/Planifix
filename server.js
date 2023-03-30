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
const api_key = 'e49d6088a7c6032be073e1e136e761fa'


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
app.get('/dashboard', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const userItems = model.get_user_items(res.locals.id);
    console.log(userItems);
    res.render('dashboard', userItems);
});

// Route POST "/add"
app.post('/add', (req, res) => {

    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const { tmdb_id, title, date, poster, type} = req.body;

    const user_id = res.locals.id;
    const item_id = model.add_item(tmdb_id, title, date, poster, type,user_id);


    if (item_id > 0) {
        res.redirect('/dashboard');
    } else {
        res.status(500).send('Erreur lors de l\'ajout de l\'élément');
    }
});

// Route GET "/edit/:id"
app.get('/edit/:id', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const item = model.get_item(req.params.id)
    res.render('edit', item);
});

// Route GET "/user_space"
app.get('/user_space', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const id = req.session.id;
    const userData = model.getUserData(id);
    res.render('user_space',userData);
});

// Route POST "/user_space"

app.post('/user_space', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const id = req.locals.id;
    const userData = getUserData(id);
    res.render('user_space',userData);
});


// Route POST "/edit/:id"
app.post('/edit/:id', (req, res) => {

    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const item_id = req.params.id;
    const item = model.get_item(item_id);

    // Mise à jour des informations de l'item avec les données du formulaire
    update_item_from_request(item, req);

    const success = model.update_item(item_id, item);

    if (success) {
        res.redirect('/dashboard');
    } else {
        res.status(500).send('Erreur lors de la mise à jour de l\'élément');
    }
    res.redirect('/dashboard');
});


// Route POST "/delete/:id"
app.post('/delete/:id', (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const item_id = req.params.id;

    const success = model.delete_item(res.locals.id, item_id);


    if (success) {
        res.redirect('/dashboard');
    } else {
        res.status(500).send('Erreur lors de la suppression de l\'élément');
    }
    res.redirect('/dashboard');
});



function update_item_from_request(item, req) {
    item.tmdb_id = req.body.tmdb_id;
    item.title = req.body.title;
    item.date = req.body.date;
    item.poster = req.body.poster;
    item.type = req.body.type;
}



app.get('/search', async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const query = req.query.query;

    if (!query) {
        res.render('search', { results: [] });
        return;
    }

    const apiUrl = `https://api.themoviedb.org/3/search/multi?api_key=${api_key}&language=fr-FR&query=${encodeURIComponent(query)}`;

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


app.listen(3000, () => console.log('listening on http://localhost:3000'));