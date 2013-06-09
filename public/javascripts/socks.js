$(function(){
    var socket = io.connect('http://localhost:3000');

    /*
    *   Jquery events
     */
    $('#send_it').click(function(){
        var words = "Word up!";
        socket.emit('send_event', {messa: words});
    });

    $('#sendMessage').click(function(){
        var userName = $('#user').val();
        var msg = $('#messageBody').val();
        socket.emit('private_message', {toUser: userName, msg: msg});
    });


    /*
    *   Socket.io events
     */
    socket.on('returnData', function(data){
        alert("Data received: " + data.returned);
    });

    socket.on('error', function(reason){
        alert("Connection to socket failed: " + reason);
    });

    socket.on('got_pm', function(data){
        alert("Message from " + data.fromUser + ": " + data.pmMsgBody);
    });

    socket.on('pm_error', function(data){
        alert("Error during PM: " + data);
    });

});
