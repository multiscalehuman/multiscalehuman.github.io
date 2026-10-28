import { screen } from '@testing-library/dom';
import userEvent from '@testing-library/user-event';
import { h, svg } from './create-element';

describe('h', () => {
  afterEach(() => {
    document.body.replaceChildren();
  });

  it('creates the requested element type with no attributes by default', () => {
    const element = h('button');

    expect(element).toBeInstanceOf(HTMLButtonElement);
    expect(element.attributes).toHaveLength(0);
    expect(element).toBeEmptyDOMElement();
  });

  it('sets a class string as given', () => {
    expect(h('p', { className: 'one two' })).toHaveAttribute('class', 'one two');
  });

  it('joins class lists in order and skips falsy entries', () => {
    expect(h('p', { className: ['one', false, null, undefined, '', 'two'] })).toHaveAttribute('class', 'one two');
    expect(h('p', { className: [false, null] })).not.toHaveAttribute('class');
  });

  it('sets attributes after the class, omitting false, null, and undefined', () => {
    const element = h('input', {
      className: 'field',
      attrs: { id: 'name', tabindex: -1, required: true, disabled: false, title: null, placeholder: undefined },
    });

    expect([...element.attributes].map((attribute) => [attribute.name, attribute.value])).toEqual([
      ['class', 'field'],
      ['id', 'name'],
      ['tabindex', '-1'],
      ['required', ''],
    ]);
  });

  it('sets standard and custom style properties', () => {
    const element = h('div', { style: { left: '10%', '--cube-layer': '3' } });

    expect(element.style.getPropertyValue('left')).toBe('10%');
    expect(element.style.getPropertyValue('--cube-layer')).toBe('3');
  });

  it('sets text before appending children and skips falsy children', () => {
    const strong = h('strong', { text: 'bold' });
    const element = h('p', { text: 'Start ' }, [strong, false, null, undefined, '', ' end']);
    document.body.append(element);

    expect(element).toHaveTextContent('Start bold end');
    expect(element.childNodes).toHaveLength(3);
    expect(element.firstElementChild).toBe(strong);
  });

  it('adds typed event listeners', async () => {
    const user = userEvent.setup();
    const onClick = vi.fn<(event: MouseEvent) => void>();
    document.body.append(h('button', { attrs: { type: 'button' }, text: 'Press', on: { click: onClick } }));

    await user.click(screen.getByRole('button', { name: 'Press' }));

    expect(onClick).toHaveBeenCalledOnce();
    expect(onClick.mock.calls[0][0]).toBeInstanceOf(MouseEvent);
  });
});

describe('svg', () => {
  it('creates elements in the SVG namespace with attributes and children', () => {
    const path = svg('path', { d: 'M0 0L1 1' });
    const icon = svg('svg', { class: 'icon', width: 24, focusable: false, 'aria-hidden': true }, [false, path]);

    expect(icon).toBeInstanceOf(SVGSVGElement);
    expect(icon.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect(path.namespaceURI).toBe('http://www.w3.org/2000/svg');
    expect([...icon.attributes].map((attribute) => [attribute.name, attribute.value])).toEqual([
      ['class', 'icon'],
      ['width', '24'],
      ['aria-hidden', ''],
    ]);
    expect([...icon.childNodes]).toEqual([path]);
  });

  it('creates an empty element by default', () => {
    const group = svg('g');

    expect(group.attributes).toHaveLength(0);
    expect(group).toBeEmptyDOMElement();
  });
});
