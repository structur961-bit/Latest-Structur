// Interpret a wall-clock time in the restaurant's timezone, not the diner's.
export function restaurantDateTime(value, timeZone = 'UTC') {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) throw new Error('Choose a valid reservation date and time.');
  const desired = Date.parse(`${value}:00Z`);
  if (!Number.isFinite(desired) || new Date(desired).toISOString().slice(0,16) !== value) throw new Error('Choose a valid reservation date and time.');
  const formatter = new Intl.DateTimeFormat('en-CA', { timeZone, year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23' });
  const wallTime = instant => {
    const parts = Object.fromEntries(formatter.formatToParts(new Date(instant)).map(part=>[part.type,part.value]));
    return Date.parse(`${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}:${parts.second}Z`);
  };
  let instant = desired;
  for(let attempt=0;attempt<4;attempt++) { const delta=desired-wallTime(instant); if(!delta) return new Date(instant).toISOString(); instant+=delta; }
  throw new Error('This local time does not exist because the clocks change. Choose another time.');
}
export function restaurantDate(timeZone = 'UTC', now = new Date()) {
  const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(part=>[part.type,part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function restaurantDateTimeInput(value, timeZone = 'UTC') {
 if (!value) return '';
 const parts=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(part=>[part.type,part.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
