const axios = require('axios');
const model = require('../models');
const api_key = 'e49d6088a7c6032be073e1e136e761fa';

exports.dashboard = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const userItems = await model.get_user_items(res.locals.id);
    const upcomingMovies = await model.get_upcoming_movies();
    const popular = await model.get_popular();

    res.render('dashboard', {
        items: userItems.items,
        upcomingMovies,
        popular,
    });
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

exports.search = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }

    const query = req.query.query;
    const filteredResults = [];

    if (!query) {
        res.render('search', { results: [] });
        return;
    }

    const apiUrl = `https://api.themoviedb.org/3/search/multi?api_key=${api_key}&language=fr-FR&query=${encodeURIComponent(query)}&region=FR`;

    try {
        const response = await axios.get(apiUrl);
        const results = response.data.results;

        results.forEach(result => {
            if (result.media_type === 'movie' || result.media_type === 'tv') {
                filteredResults.push(result);
            }
        });

        res.render('search', { results: filteredResults });
    } catch (err) {
        console.error('Error fetching data:', err);
        res.status(500).send('Erreur lors de la récupération des données de');
    }
};

exports.read = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    let apiUrl;

    if (req.query.type === 'movie' || req.query.type === 'Film') {
        apiUrl = `https://api.themoviedb.org/3/movie/${req.params.id}?api_key=${api_key}&language=fr-FR&region=FR&append_to_response=watch/providers`;
    } else if (req.query.type === 'tv' || req.query.type === 'S\u00e9rie' || req.query.type === 'Anime') {
        apiUrl = `https://api.themoviedb.org/3/tv/${req.params.id}?api_key=${api_key}&language=fr-FR&region=FR&append_to_response=watch/providers`;
    } else {
        res.status(400).send('Type de contenu non pris en charge. Veuillez sp\u00e9cifier "movie", "Film", "tv", "S\u00e9rie" ou "Anime" comme type.');
        return;
    }
    try {
        const response = await axios.get(apiUrl);
        const movie = response.data;
        const frenchProviders = movie['watch/providers'].results.FR;

        movie.release_date = req.query.date;

        res.render('read', { movie, frenchProviders });
    } catch (err) {
        console.error('Error fetching data from TMDB API:', err);
        res.status(500).send('Erreur lors de la r\u00e9cup\u00e9ration des donn\u00e9es');
    }
};

exports.addItem = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const { tmdb_id, title, date, poster, type } = req.body;

    const user_id = res.locals.id;
    const item_id = await model.add_item(tmdb_id, title, date, poster, type, user_id);

    const item_name = (await model.get_item(item_id)).title;

    if (item_id > 0) {
        res.redirect(`/dashboard?added=${item_name}`);
    } else {
        res.redirect('/dashboard');
    }
};

exports.deleteItem = async (req, res) => {
    if (!res.locals.authenticated) {
        res.redirect('/login');
        return;
    }
    const item_id = req.params.id;
    const item_name = (await model.get_item(item_id)).title;
    const success = await model.delete_item(res.locals.id, item_id);

    if (success) {
        res.redirect(`/dashboard?deleted=${item_name}`);
    } else {
        res.redirect('/dashboard');
    }
};

