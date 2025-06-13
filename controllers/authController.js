const model = require('../models');

exports.index = (req, res) => {
    if (!res.locals.authenticated) {
        res.render('index');
    } else {
        res.redirect('/dashboard');
    }
};

exports.showNewUser = (req, res) => {
    res.render('new_user');
};

exports.showLogin = (req, res) => {
    if (!res.locals.authenticated) {
        res.render('login');
    } else {
        res.redirect('/dashboard');
    }
};

exports.logout = (req, res) => {
    req.session = null;
    res.redirect('/');
};

exports.login = async (req, res) => {
    const email = req.body.email;
    const password = req.body.password;

    const user = await model.login(email, password);

    if (user == null) {
        res.redirect("/login?message=Nom d'utilisateur ou mot de passe incorrect.");
    } else {
        req.session.userid = user.id;
        req.session.username = await model.getUsername(user.id);
        res.redirect('/dashboard');
    }
};

exports.newUser = async (req, res) => {
    const username = req.body.username;
    const email = req.body.email.toLowerCase();
    const password = req.body.password;

    const new_user = await model.new_user(username, email, password);
    if (new_user == -1) {
        res.redirect('/new_user?message=Vous avez deja un compte');
    } else {
        req.session.userid = new_user;
        req.session.username = username;
        res.redirect('/');
    }
};

exports.userSpace = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const user_id = res.locals.id;
    const user_name = await model.getUsername(user_id);
    const user_email = await model.get_user_data(user_id);
    res.render('user_space', { user_name, email: user_email });
};

exports.changeUsernameForm = (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    res.render('change_username');
};

exports.changeUsername = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const user_id = res.locals.id;
    const new_username = req.body.new_username;
    const password = req.body.password;
    const result = await model.update_username(user_id, new_username, password);

    if (result == 'wrong_password') {
        res.redirect('/change_username?wrong_password=true');
    } else {
        res.redirect('/user_space?change_successfully=true');
    }
};

exports.changeEmailForm = (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    res.render('change_email');
};

exports.changeEmail = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const user_id = res.locals.id;
    const new_email = req.body.new_email;
    const confirm_new_email = req.body.confirm_new_email;
    const password = req.body.password;
    const result = await model.update_email(user_id, new_email, confirm_new_email, password);
    if (result == 'wrong_password') {
        res.redirect('/change_email?wrong_password=true');
    } else if (result == 'email_unavailable') {
        res.redirect('/change_email?email_unavailable=true');
    } else if (result == 'emails_not_match') {
        res.redirect('/change_email?emails_not_match=true');
    } else {
        res.redirect('/user_space?change_successfully=true');
    }
};

exports.changePasswordForm = (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    res.render('change_password');
};

exports.changePassword = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const user_id = res.locals.id;
    const password = req.body.password;
    const new_password = req.body.new_password;
    const confirm_new_password = req.body.confirm_new_password;
    const result = await model.update_password(user_id, password, new_password, confirm_new_password);
    if (result == 'wrong_password') {
        res.redirect('/change_password?wrong_password=true');
    } else if (result == 'passwords_not_match') {
        res.redirect('/change_password?passwords_not_match=true');
    } else {
        res.redirect('/user_space?change_successfully=true');
    }
};

