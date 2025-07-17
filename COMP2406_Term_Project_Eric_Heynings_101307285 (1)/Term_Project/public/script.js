document.addEventListener('DOMContentLoaded', function() {
    if(document.getElementById('weather')){
        fetchWeather();
    }
    
    var regForm = document.getElementById('registerForm');
    if(regForm){
      regForm.addEventListener('submit', function(e) {
          e.preventDefault();
          var formData = new FormData(regForm);
          var xhr = new XMLHttpRequest();
          xhr.onreadystatechange = function() {
              if(xhr.readyState === 4 && xhr.status === 200){
                  alert("Registration successful. Please log in with your new credentials.");
                  window.location.href = "/login";
              }
          };
          xhr.open('POST', '/register', true);
          xhr.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
          xhr.send(new URLSearchParams(formData).toString());
      });
    }
    
    var addTaskBtn = document.getElementById('addTaskButton');
    if(addTaskBtn){
      addTaskBtn.addEventListener('click', function() {
          var taskInput = document.getElementById('newTask');
          var task = taskInput.value.trim();
          if(task === ""){
              alert("Please enter a task");
              return;
          }
          addTask(task);
          taskInput.value = "";
      });
    }
    
    var newTaskInput = document.getElementById('newTask');
    if(newTaskInput){
      newTaskInput.addEventListener('keyup', function(e) {
          if(e.keyCode === 13){
              var addBtn = document.getElementById('addTaskButton');
              if(addBtn){
                  addBtn.click();
              }
          }
      });
    }
});

// fetch weather info from the weather api
function fetchWeather(){
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status === 200){
            var response = JSON.parse(xhr.responseText);
            var temperature = (response.main && response.main.temp) ? response.main.temp : 'N/A';
            document.getElementById('weather').innerHTML = '<h3>Ottawa Temperature: ' + temperature + '°C</h3>';
        }
    };
    xhr.open('GET', '/weather?city=Ottawa', true);
    xhr.send();
}

// AJAX: Add a new task; on success, reload page to update tasks
function addTask(task){
    var severitySelect = document.getElementById('taskSeverity');
    var severity = severitySelect ? severitySelect.value : "1";
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status === 200){
            var response = JSON.parse(xhr.responseText);
            if(response.success){
                window.location.reload();
            } else {
                alert(response.message);
            }
        }
    };
    xhr.open('POST', '/addTask', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ task: task, severity: severity }));
}
  
// AJAX: Mark a task as complete; on success, reload page to update tasks
function completeTask(taskId){
    var xhr = new XMLHttpRequest();
    xhr.onreadystatechange = function(){
        if(xhr.readyState === 4 && xhr.status === 200){
            var response = JSON.parse(xhr.responseText);
            if(response.success){
                window.location.reload();
            } else {
                alert(response.message);
            }
        }
    };
    xhr.open('POST', '/completeTask', true);
    xhr.setRequestHeader('Content-Type', 'application/json');
    xhr.send(JSON.stringify({ taskId: taskId }));
}
