export function findLink(t: string): string | undefined {
    const match = t.match(/https?:\/\/([\w.-]+)[^ ]*/);
    if (match && match[0]) {
      return match[0];
    }
    return undefined;
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
  