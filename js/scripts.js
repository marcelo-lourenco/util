function displayErrorMessage(message) {
  const errorMessage = document.querySelector('.error-message');
  errorMessage.textContent = message;
  errorMessage.style.display = 'block';
  document.querySelector('.success-message').style.display = 'none';
  document.querySelector('.info-message').style.display = 'none';
}

function displaySuccessMessage(message) {
  const successMessage = document.querySelector('.success-message');
  successMessage.textContent = message;
  successMessage.style.display = 'block';
  document.querySelector('.error-message').style.display = 'none';
  document.querySelector('.info-message').style.display = 'none';
}

function displayInfoMessage(message) {
  const infoMessage = document.querySelector('.info-message');
  infoMessage.textContent = message;
  infoMessage.style.display = 'block';
  document.querySelector('.success-message').style.display = 'none';
  document.querySelector('.error-message').style.display = 'none';
}