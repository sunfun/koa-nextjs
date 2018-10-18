const assert = require("assert");
const Koa = require("koa");
const Router = require("koa-router");
const nextjs = require("next");

module.exports = async function render(app, { options = {}, route } = {}) {
  assert(
    app instanceof Koa,
    `First argument must be an instance of Koa got: ${typeof app}`,
  );
  assert(
    options === Object(options),
    `Second argument must be an object, got: ${typeof options}`,
  );

  const DEFAULT_NEXT = {
    quiet: true,
    dev: process.env.NODE_ENV !== "production",
  };
  const DEFAULT_ROUTE = "/_next/*";

  // eslint-disable-next-line no-param-reassign, no-shadow
  app.context.render = async function render({ screen }) {
    // Dummy function while `nextEngine.prepare` is getting ready.
    const ctx = this;

    ctx.body = `Preparing to render ${screen}... refresh this page in a few seconds.`;
    return null;
  };

  // Setup Next.js
  const nextEngine = nextjs(Object.assign({}, DEFAULT_NEXT, options));
  const handle = nextEngine.getRequestHandler();
  await nextEngine.prepare(); // this takes time.

  // eslint-disable-next-line no-param-reassign, no-shadow
  app.context.render = async function render({ screen, props = {}, options }) {
    const ctx = this;

    // Here we take the React.js page and convert it to HTML in the server
    // After the client downloads the JS files (see /_next/) the React.js is re-hydrated

    // https://github.com/zeit/next.js/blob/canary/server/render.js
    const html = await nextEngine.renderToHTML(
      ctx.req,
      ctx.res,
      `/${screen}`,
      props,
      options,
    );
    ctx.body = html;
    return html;
  };

  const router = new Router();

  router.get(route || DEFAULT_ROUTE, async ctx => {
    // Ups! we need because Next.js send the response prematurely
    ctx.respond = false;
    await handle(ctx.req, ctx.res);
  });

  app.use(router.routes());

  return app;
};
