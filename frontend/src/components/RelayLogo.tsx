import type { MouseEvent } from 'react';
import louisiana from '../assets/louisiana.svg';
import './RelayLogo.css';

type Props = { size?: 'sidebar' | 'compact'; onHome?: () => void };

/** One wordmark: R, E, Louisiana in place of L, A, Y, 4. */
export default function RelayLogo({ size = 'sidebar', onHome }: Props) {
  function navigate(event: MouseEvent<HTMLAnchorElement>) {
    if (!onHome || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    onHome();
  }
  return (
    <a className={`relay-logo relay-logo--${size}`} href="#/home" aria-label="Relay4" onClick={navigate}>
      <span className="relay-logo__word" aria-hidden="true">
        <span className="relay-logo__letter relay-logo__letter--r">R</span>
        <span className="relay-logo__letter relay-logo__letter--e">E</span>
        <img className="relay-logo__louisiana" src={louisiana} alt="" draggable={false} />
        <span className="relay-logo__letter">A</span>
        <span className="relay-logo__letter">Y</span>
        <span className="relay-logo__letter relay-logo__four">4</span>
      </span>
    </a>
  );
}
