/** Native POST navigation keeps report data out of URLs and browser history. */
export function openMasteringReport(payload: unknown) {
  const form = document.createElement('form');
  form.method = 'POST';
  form.action = '/api/report';
  form.target = '_blank';
  // Keep the same-origin POST Origin header; noreferrer can turn it into null.
  form.setAttribute('rel', 'noopener');
  form.hidden = true;
  const field = document.createElement('input');
  field.type = 'hidden';
  field.name = 'data';
  field.value = JSON.stringify(payload);
  form.appendChild(field);
  document.body.appendChild(form);
  // Chrome schedules native navigation after submit(); removing the form in
  // this same task can cancel it before the new tab sends its request.
  try { form.submit(); }
  catch (error) { form.remove(); throw error; }
  setTimeout(() => form.remove(), 1000);
}
