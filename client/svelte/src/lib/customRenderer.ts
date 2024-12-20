import { Renderer, type Tokens, marked } from 'marked';
import hljs from 'highlight.js';

const renderer = new Renderer({
	gfm: true
});

const getLanguage = (language: string | undefined): string => {
	let lang = language ?? 'javascript';
	return hljs.getLanguage(lang) ? lang : 'javascript';
};

renderer.code = ({ text, lang, escaped }) => {
	const language = getLanguage(lang);
	const highlightResult = hljs.highlight(text, { language }).value;
	console.log(highlightResult);
	return `
	  <pre class="theme-stackoverflow-dark shadow-3xl text-sm relative overflow-hidden max-w-full mb-6">
	  	<span class="hljs mb-0 p-4 block min-h-full overflow-auto">
			<button aria-label="copy" class="copy-btn absolute top-2 right-2 z-10 flex rounded-full bg-gray-700 p-2 text-white hover:bg-gray-600">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					height="16px"
					viewBox="0 -960 960 960"
					width="16px"
					fill="#e8eaed"><path
						d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h167q11-35 43-57.5t70-22.5q40 0 71.5 22.5T594-840h166q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560h-80v120H280v-120h-80v560Zm280-560q17 0 28.5-11.5T520-800q0-17-11.5-28.5T480-840q-17 0-28.5 11.5T440-800q0 17 11.5 28.5T480-760Z"
						/>
				</svg>
			</button>	
			${highlightResult}
		</span>
	 </pre>
  `;
};

export { renderer };


