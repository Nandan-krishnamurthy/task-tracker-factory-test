import { APP_TITLE } from './app/title';

const root = document.querySelector<HTMLDivElement>('#app');
if (!root) {
  throw new Error('Missing #app root element');
}

const heading = document.createElement('h1');
heading.textContent = APP_TITLE;
root.replaceChildren(heading);
