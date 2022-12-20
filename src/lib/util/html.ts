export function findLink(t: string): string | undefined {
  const match = t.match(/https?:\/\/([\w.-]+)[^ ]*/);
  if (match && match[0]) {
    return match[0];
  }
  let m = ytVidId(t)
  
  return (m ? m : undefined);
}

/**
 * JavaScript function to match (and return) the video Id 
 * of any valid Youtube Url, given as input string.
 * @author: Stephan Schmitz <eyecatchup@gmail.com>
 * @url: https://stackoverflow.com/a/10315969/624466
 */
function ytVidId(url) {
  var p = /^(?:https?:\/\/)?(?:www\.)?(?:youtu\.be\/|youtube\.com\/(?:embed\/|v\/|watch\?v=|watch\?.+&v=))((\w|-){11})(?:\S+)?$/;
  let match = url.match(p)
  return (match) ? match[0] : false;
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
