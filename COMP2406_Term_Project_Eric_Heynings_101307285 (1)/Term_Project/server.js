/*
 (c) 2025 Louis. D. Nel (Modified for Separate Pages with Login Button)
 
 Sets up express, middleware, and full page routes including login
*/

var express = require('express')
var path = require('path')
var favicon = require('serve-favicon')
var logger = require('morgan')
const http = require('http')
var hbs = require('hbs')

var app = express()
const PORT = process.env.PORT || 3000

app.set('views', path.join(__dirname, 'views'))
app.set('view engine', 'hbs')
app.locals.pretty = true

// helper to map severity to a red shade
hbs.registerHelper('severityColor', function(sev) {
  var colors = {
    1: "#ffcccc",
    2: "#ff9999",
    3: "#ff6666",
    4: "#ff3333",
    5: "#ff0000"
  }
  return colors[sev] || "#ffcccc"
})

// helper for checking >= (used in admin view)
hbs.registerHelper('gte', function(a, b) {
  return a >= b
})

app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')))
app.use(logger('dev'))
app.use(express.static(path.join(__dirname, 'public')))
app.use(express.urlencoded({ extended: false }))
app.use(express.json())

var routes = require('./routes/index')

// Full page routes
app.get('/', routes.landing)
app.get('/landing', routes.landing)
app.get('/register', routes.registerPage)
app.get('/login', routes.authenticate, routes.dashboard) // login route (protected by basic auth)
app.get('/dashboard', routes.authenticate, routes.dashboard)
app.get('/admin', routes.authenticate, routes.admin)

// Registration form submission
app.post('/register', routes.register)

// Weather API route (returns Ottawa weather)
const API_KEY = 'ebd181a0137000d84cb8b6be1f7a5bc0' // replace with your key if needed
app.get('/weather', function(req, res) {
    let city = req.query.city
    if(!city) {
      res.json({ message: 'Please enter a city name' })
      return
    }
    let options = {
      host: 'api.openweathermap.org',
      path: '/data/2.5/weather?q=' + city + '&appid=' + API_KEY + '&units=metric'
    }
    http.request(options, function(apiRes) {
      let weatherData = ''
      apiRes.on('data', function(chunk) { weatherData += chunk })
      apiRes.on('end', function() {
        res.contentType('application/json').json(JSON.parse(weatherData))
      })
    }).end()
})

// AJAX endpoints for tasks (protected)
app.post('/addTask', routes.authenticate, routes.addTask)
app.post('/completeTask', routes.authenticate, routes.completeTask)

app.listen(PORT, function(err) {
    if(err) console.log(err)
    else {
        console.log('Server listening on port: ' + PORT)
        console.log('Visit http://localhost:' + PORT + '/landing to use the app')
    }
})
