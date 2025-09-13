export async function getRecordings() {
  const response = await fetch('/recordings.json');
  return response.json();
}