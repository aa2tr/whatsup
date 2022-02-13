import adapter from '@sveltejs/adapter-static';

const dev = process.env.NODE_ENV === 'development';

console.log(dev)

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter({
			// default options are shown
			pages: 'build',
			assets: 'build',
			fallback: 'index.html',
			precompress: false
		}),
		trailingSlash : "ignore",
		paths: {
			base: dev ?  '' : "/whatsup",
		},
	},

};

export default config;
