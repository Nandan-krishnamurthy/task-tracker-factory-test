import { createController } from './app/controller';
import { newId } from './app/ids';
import { APP_TITLE } from './app/title';
import { bindEvents } from './ui/events';
import { render } from './ui/render';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Missing #app root element');
}

const heading = document.createElement('h1');
heading.textContent = APP_TITLE;
const main = document.createElement('main');
root.replaceChildren(heading, main);

const controller = createController({
  render: (state) => render(main, state),
  now: () => new Date(),
  newId,
});
render(main, controller.state());
bindEvents(main, controller);
