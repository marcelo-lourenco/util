(function ($) {
  'use strict';

  // data background
  $('[data-background]').each(function () {
    $(this).css({
      'background-image': 'url(' + $(this).data('background') + ')'
    });
  });

  // collapse
  $('.collapse').on('shown.bs.collapse', function () {
    $(this).parent().find('.ti-plus').removeClass('ti-plus').addClass('ti-minus');
  }).on('hidden.bs.collapse', function () {
    $(this).parent().find('.ti-minus').removeClass('ti-minus').addClass('ti-plus');
  });

  // match height
  $('.match-height').matchHeight({
    byRow: true,
    property: 'height',
    target: null,
    remove: false
  });

})(jQuery);

function toggleNavbarInvert() {
  const navbar = document.querySelector('.main-navbar');
  const hero = document.querySelector('.main-hero');
  if (!navbar) return;
  if (!hero) {
    navbar.classList.add('invert');
    return;
  }
  const rect = hero.getBoundingClientRect();
  // Se o banner não está visível na viewport
  if (rect.bottom <= 0) {
    navbar.classList.add('invert');
  } else {
    navbar.classList.remove('invert');
  }
}
window.addEventListener('scroll', toggleNavbarInvert);
window.addEventListener('resize', toggleNavbarInvert);
document.addEventListener('DOMContentLoaded', toggleNavbarInvert);

function displayMessage(type, message) {
  const messageTypes = ['danger', 'info', 'success', 'warning'];
  messageTypes.forEach(msgType => {
    const element = document.querySelector(`.alert-${msgType}`);
    if (msgType === type) {
      element.textContent = message;
      element.style.display = 'block';
    } else {
      element.style.display = 'none';
    }
  });
}

function displayErrorMessage(message) {
  displayMessage('danger', message);
}

function displayInfoMessage(message) {
  displayMessage('info', message);
}

function displaySuccessMessage(message) {
  displayMessage('success', message);
}

function displayWarningMessage(message) {
  displayMessage('warning', message);
}
