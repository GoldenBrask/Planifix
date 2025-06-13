var express = require('express');
var path = require('path');
var mustache = require('mustache-express');
const cookieSession = require('cookie-session');
const crypto = require('crypto');
const model = require('./models');
const authController = require('./controllers/authController');
const itemController = require('./controllers/itemController');
var app = express();
app.engine('html', mustache());
app.set('view engine', 'html');
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'views', 'images')));
app.use(express.static(path.join(__dirname, 'views', 'css')));
app.use(express.static(path.join(__dirname, 'views', 'script')));


const bodyParser = require('body-parser');
app.use(bodyParser.urlencoded({ extended: false }));

const secret = crypto.randomBytes(32).toString('hex');

app.use(cookieSession({
    secret: secret,
}));



async function is_authenticated(req, res, next) {
    if (req.session && req.session.userid) {
        res.locals.authenticated = true;
        res.locals.username = await model.getUsername(req.session.userid);
        res.locals.id = req.session.userid;
    } else {
        res.locals.authenticated = false;
        res.locals.name = "";
        res.locals.id = "";
    }
    next();
};

app.use(is_authenticated);

/////////*ROUTE GET **////////////
/*PAGE D'ACCEUIL**/
app.get('/', authController.index);
app.get('/new_user', authController.showNewUser);
app.get('/login', authController.showLogin);
app.get('/logout', authController.logout);
app.get('/dashboard', itemController.dashboard);


/*ESPACE UTILISATEUR**/
app.get('/user_space', authController.userSpace);


// Route GET "/change_username"
app.get('/change_username', authController.changeUsernameForm);


// Route GET "/change_email"
app.get('/change_email', authController.changeEmailForm);


// Route GET "/change_password"
app.get('/change_password', authController.changePasswordForm);


app.get('/search', itemController.search);

app.get('/read/:id', itemController.read);

/*\\\\\\\\\\\ROUTE GET \\\\\\\\\\\\\\\\\*/


/////////*ROUTE POST **////////////

// Route POST "/add"
app.post('/add', itemController.addItem);


// Route POST "/login"
app.post('/login', authController.login);

// Route POST "new_user"
app.post('/new_user', authController.newUser);

// Route POST "change_username"
app.post('/change_username', authController.changeUsername);


// Route POST "/change_email"
app.post('/change_email', authController.changeEmail);

// Route POST "/change_password"
app.post('/change_password', authController.changePassword);

// Route POST "/delete/:id"
app.post('/delete/:id', itemController.deleteItem);

/*\\\\\\\\\\\ROUTE POST \\\\\\\\\\\\\\\\\*/

app.listen(3000, () => console.log('listening on http://localhost:3000'));
