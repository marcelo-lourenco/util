function displayMessage(type, message) {
  const messageTypes = ['error', 'success', 'info', 'warning'];
  messageTypes.forEach(msgType => {
    const element = document.querySelector(`.${msgType}-message`);
    if (msgType === type) {
      element.textContent = message;
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  });
}

function displayErrorMessage(message) {
  displayMessage('error', message);
}

function displaySuccessMessage(message) {
  displayMessage('success', message);
}

function displayInfoMessage(message) {
  displayMessage('info', message);
}

function displayWarningMessage(message) {
  displayMessage('warning', message);
}