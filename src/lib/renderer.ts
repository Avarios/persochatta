import { marked } from 'marked';
import hljs from 'highlight.js';

const renderer = new marked.Renderer();
renderer.code = ({ text, lang }) => {
	const validLanguage = lang && hljs.getLanguage(lang) ? lang : 'plaintext';
	const highlightedCode = hljs.highlight(text, { language: validLanguage }).value;

	return `<div class="code-block">
                  <div class="code-header">
                    <span class="code-language">${validLanguage}</span>
                  </div>
                  <pre class="hljs"><code class="language-${validLanguage}">${highlightedCode}</code></pre>
                </div>`;
};

marked.setOptions({
	renderer,
	pedantic: false,
	gfm: true,
	breaks: true
});

renderer.html = function (html) {
	return `<pre><code class="language-html">${hljs.highlight(String(html), { language: 'html' }).value}</code></pre>`;
};
marked.use({ renderer });

export { marked };
