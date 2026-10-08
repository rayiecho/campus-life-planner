// Small helpers for showing errors and status messages.

export function showError(input, message) {
  const box = document.getElementById(input.id + '-error');
  if (message) {
    input.setAttribute('aria-invalid', 'true');
    box.textContent = message;
  } else {
    input.removeAttribute('aria-invalid');
    box.textContent = '';
  }
}

export function clearErrors(form) {
  form.querySelectorAll('[aria-invalid]').forEach(el => el.removeAttribute('aria-invalid'));
  form.querySelectorAll('.error').forEach(el => (el.textContent = ''));
}

// Emptying first makes screen readers repeat the message even if the text is the same
export function setStatus(id, message) {
  const el = document.getElementById(id);
  el.textContent = '';
  setTimeout(() => (el.textContent = message), 50);
}