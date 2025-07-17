
var url = require('url')
var sqlite3 = require('sqlite3').verbose()
var path = require('path')

var db = new sqlite3.Database(path.join(__dirname, '../data/task_tracker.db'))

db.serialize(function(){
    // Create users table (userid, password, role)
    db.run("CREATE TABLE IF NOT EXISTS users (userid TEXT PRIMARY KEY, password TEXT, role TEXT)")
    // Default users (edit these values if needed)
    db.run("INSERT OR REPLACE INTO users VALUES ('admin', 'adminpass', 'admin')")
    db.run("INSERT OR REPLACE INTO users VALUES ('guest', 'guestpass', 'guest')")
    // Create tasks table with severity and completed flag
    db.run("CREATE TABLE IF NOT EXISTS tasks (id INTEGER PRIMARY KEY AUTOINCREMENT, userid TEXT, task TEXT, severity INTEGER, completed INTEGER DEFAULT 0)")
})

// Basic auth middleware using HTTP Basic Auth
exports.authenticate = function(req, res, next) {
    var auth = req.headers.authorization
    if(!auth){
        res.setHeader('WWW-Authenticate', 'Basic realm="Need to login"')
        res.writeHead(401, { 'Content-Type': 'text/html' })
        res.end('<h1>401 Unauthorized</h1>')
    } else {
        var tmp = auth.split(' ')
        var buf = Buffer.from(tmp[1], 'base64')
        var plain_auth = buf.toString() // expected "username:password"
        var credentials = plain_auth.split(':')
        var username = credentials[0]
        var password = credentials[1]
        db.get("SELECT userid, password, role FROM users WHERE userid = ?", [username], function(err, row) {
            if(err || !row || row.password !== password){
                res.setHeader('WWW-Authenticate', 'Basic realm="Need to login"')
                res.writeHead(401, { 'Content-Type': 'text/html' })
                res.end('<h1>401 Unauthorized</h1>')
            } else {
                req.user = { userid: row.userid, role: row.role }
                next()
            }
        })
    }
}

// Render landing page (full page)
exports.landing = function(req, res) {
    res.render('landing', { title: 'Welcome' })
}

// Render register page (full page) with a login option in the content
exports.registerPage = function(req, res) {
    res.render('register', { title: 'Register' })
}

// Dashboard route (protected) - shows user tasks and points
exports.dashboard = function(req, res) {
    var userid = req.user.userid
    db.all("SELECT * FROM tasks WHERE userid = ?", [userid], function(err, rows){
        if(err) {
            res.status(500).send("Error retrieving tasks.")
        } else {
            db.get("SELECT SUM(severity) as points FROM tasks WHERE userid = ? AND completed = 1", [userid], function(err2, result) {
                var points = result && result.points ? result.points : 0
                var progress = Math.min(100, (points / 15) * 100)
                res.render('dashboard', { title: 'Your Daily Tasks', tasks: rows, user: req.user, points: points, progress: progress })
            })
        }
    })
}

// Admin route (protected)
// If user is not admin, render a friendly error page (using adminError view)
exports.admin = function(req, res) {
    if(req.user.role !== 'admin'){
        res.render('adminError', { title: 'Admin Error', message: "Unauthorized: You lack admin privileges to view this content." });
        return;
    }
    db.all("SELECT * FROM tasks", function(err, rows){
        if(err){
            res.status(500).send("Error retrieving tasks.")
        } else {
            db.all("SELECT userid, SUM(severity) as points FROM tasks WHERE completed = 1 GROUP BY userid", function(err2, pointsRows) {
                res.render('admin', { title: 'Admin: All User Tasks', tasks: rows, user: req.user, userPoints: pointsRows })
            })
        }
    })
}

// Process registration submission (POST)
// On success, instruct the user to log in (which triggers basic auth)
exports.register = function(req, res) {
    var username = req.body.username
    var password = req.body.password
    if(!username || !password){
        res.send("Username and password required.")
        return;
    }
    db.get("SELECT userid FROM users WHERE userid = ?", [username], function(err, row){
       if(row){
           res.send("User already exists. Please choose a different username.")
       } else {
           db.run("INSERT INTO users (userid, password, role) VALUES (?, ?, 'guest')", [username, password], function(err) {
              if(err){
                  res.send("Error occurred during registration.")
              } else {
                  res.send(`
                    <p>Registration successful! Please log in with your new credentials.</p>
                    <script>
                      setTimeout(function(){
                          window.location.href = "/login";
                      }, 1500);
                    </script>
                  `);
              }
           });
       }
    });
};

// AJAX endpoint: Add a new task
exports.addTask = function(req, res) {
    var userid = req.user.userid
    var taskText = req.body.task
    var severity = parseInt(req.body.severity) || 1
    if(!taskText){
        res.json({ success: false, message: "Task text is required." })
        return;
    }
    db.run("INSERT INTO tasks (userid, task, severity, completed) VALUES (?, ?, ?, 0)", [userid, taskText, severity], function(err) {
        if(err){
            res.json({ success: false, message: "Error adding task." });
        } else {
            res.json({ success: true, taskId: this.lastID, severity: severity });
        }
    });
};

// AJAX endpoint: Mark a task as complete
exports.completeTask = function(req, res) {
    var userid = req.user.userid
    var taskId = req.body.taskId
    db.get("SELECT * FROM tasks WHERE id = ?", [taskId], function(err, row) {
        if(err || !row){
            res.json({ success: false, message: "Task not found." });
        } else {
            if(row.userid !== userid && req.user.role !== 'admin'){
                res.json({ success: false, message: "Unauthorized to modify this task." });
            } else {
                db.run("UPDATE tasks SET completed = 1 WHERE id = ?", [taskId], function(err){
                    if(err){
                        res.json({ success: false, message: "Error updating task." });
                    } else {
                        res.json({ success: true, severity: row.severity });
                    }
                });
            }
        }
    });
};
