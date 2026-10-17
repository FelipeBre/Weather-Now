<<<<<<< HEAD
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
=======
from flask import Flask, render_template

app = Flask(__name__)

@app.route('/')
def home():
    return render_template('index.html')

if __name__ == '__main__':
>>>>>>> cc0c6ed2507964f6179fb5caf1db7186b8f47889
    app.run(debug=True)