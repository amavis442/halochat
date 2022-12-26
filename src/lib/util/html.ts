export function findLink(t: string): string | undefined {
  let m = ytVidId(t);
  if (m) return m;

  let p = imgTag(t);
  if (p) return p;

  const match = t.match(/https?:\/\/([\w.-]+)[^ ]*/);
  if (match && match[0]) {
    return match[0];
  }

  return undefined;
}

/**
 * JavaScript function to match (and return) the video Id 
 * of any valid Youtube Url, given as input string.
 * @author: Stephan Schmitz <eyecatchup@gmail.com>
 * @url: https://stackoverflow.com/a/10315969/624466
 */
function ytVidId(url: string) {
  let match = url.match(/^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/);
  return (match && match[0]) ? match[0] : false;
}

function imgTag(url: string) {
  let match = url.match( /^https?:\/\/(?:[a-z\-]+\.)+[a-z]{2,6}(?:\/[^\/#?]+)+\.(?:jpe?g|gif|png|webp)$/i);
  return (match && match[0]) ? match[0] : false;
}



export function escapeHtml(html: string): string {
  const div = document.createElement("div");
  div.innerText = html;

  return div.innerHTML;
}

export function toHtml(content: string): string {
  return escapeHtml(content)
    .replace(/\n/g, "<br />")
    .replace(/https?:\/\/([\w.-]+)[^ ]*/g, (url, domain) => {
      return `<a href="${url}" target="_blank noopener" class="underline">${domain}</a>`;
    });
}
