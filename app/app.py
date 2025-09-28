from flask import Flask, render_template, request, redirect, url_for

app = Flask(__name__)

events = [{'イベント名':'event_name', 'イベント日付':'event_date', '参加者の名前':'participant_name'}]

@app.route('/', methods=['GET', 'POST'])
def index():
  if request.method == 'POST':
    event_name = request.form.get('event_name')
    event_date = request.form.get('event_date')
    participant_name = request.form.get('participant_name')

    if event_name:
      events['イベント名'] = event_name
    if event_date:
      events['イベント日付'] = event_date
    if participant_name:
      events['参加者の名前'] = participant_name
    
    return redirect(url_for('user_dashboard'))
  
  else:
    return render_template('index.html')
  

@app.route("/user_dashboard")
def user_dashboard():
    return render_template("user_dashboard.html", events=events)


