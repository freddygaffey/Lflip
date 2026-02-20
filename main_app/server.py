import flask
import flask_login

app = flask.Flask(__name__)
app.secret_key = "super secret string"  # Change this!

login_manager = flask_login.LoginManager()
login_manager.init_app(app)

class User(flask_login.UserMixin):
    def __init__(self, email, password, role=None):
        self.id = email
        self.password = password
        self.role = role or []

users = {"leafstorm": User("leafstorm", "secret")}


@login_manager.user_loader
def user_loader(id):
    return users.get(id)

@app.get("/login")
def login():
    return """<form method=post>
      Email: <input name="email"><br>
      Password: <input name="password" type=password><br>
      <button>Log In</button>
    </form>"""

@app.post("/login")
def login_post():
    user = users.get(flask.request.form["email"])

    if user is None or user.password != flask.request.form["password"]:
        return flask.redirect(flask.url_for("login"))

    flask_login.login_user(user)
    return flask.redirect(flask.url_for("protected"))

@app.route("/protected")
# @flask_login.login_required
@flask_login.roles_required("asdf")
def protected():
    return flask.render_template_string(
        "Logged in as: {{ user.id }}",
        user=flask_login.current_user
    )

@app.route("/logout")
def logout():
    flask_login.logout_user()
    return "Logged out"
    
    
app.run()

# from flask import Flask, render_template, url_for, redirect, request
# from data import db, Task
# from task import user_create_task, user_update_task, user_delete_task

# app = Flask(__name__)
# app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///example_test_db.db'
# db.init_app(app)

# @app.route('/', methods=['GET'])
# def dashboard():
#     all_tasks = Task.query.all()
#     return render_template('dashboard.html', tasks=all_tasks)

# @app.route('/create_task', methods=['POST', 'GET'])
# def create_task():
#     if request.method == 'POST': 
#         title = request.form.get('title')
#         description = request.form.get('description')
#         priority = request.form.get('priority')

#         user_create_task(title, description, priority)

#         return redirect(url_for('dashboard'))
#     else: 
#         return render_template('create_task.html')

# @app.route('/update_task', methods=['POST', 'GET'])
# def update_task():
#     if request.method == 'POST': 
#         task_id = request.form.get('id')

#         return redirect(url_for('dashboard'))
#     else:
#          return render_template('update_task.html')

# @app.route('/delete_task', methods=['POST', 'GET'])
# def delete_task():
#     if request.method == 'POST':
#         task_id = request.form.get('id')

#         return redirect(url_for('dashboard'))
#     else:
#         return render_template('delete_task.html')

# if __name__ == '__main__':
#     with app.app_context():
#         db.create_all()
#     app.run()
