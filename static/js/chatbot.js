$(document).ready(function () {
    $('#send-btn').on('click', function () {
        sendMessage();
    });

    $('#user-input').keypress(function (e) {
        if (e.which === 13) { // Enter key pressed
            sendMessage();
        }
    });

    function sendMessage() {
        var userInput = $('#user-input').val().trim();
        if (userInput) {
            displayMessage(userInput, 'user');
            $('#user-input').val('');

            // Send user input to the Flask server via AJAX
            $.ajax({
                url: '/send_message',  // Flask route
                method: 'POST',
                contentType: 'application/json',
                data: JSON.stringify({ 'message': userInput }),  // Send message as JSON
                success: function (response) {
                    // Display bot response
                    displayMessage(response.message, 'bot');
                },
                error: function () {
                    displayMessage("Error communicating with the server.", 'bot');
                }
            });
        }
    }

    function displayMessage(message, sender) {
        var messageClass = sender === 'user' ? 'user-message' : 'bot-message';
        var newMessage = `<div class="chat-message ${messageClass}">${message}</div>`;
        $('#chat-window').append(newMessage);
        $('#chat-window').animate({ scrollTop: $('#chat-window')[0].scrollHeight }, 500);
    }
});
