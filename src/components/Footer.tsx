import { site } from '../content/site'
import { goTo } from '../lib/motion'
import Magnetic from './Magnetic'
import Signature from './Signature'

/** Signature, name, year, "Built by me", back to top. */
export default function Footer() {
  return (
    <footer className="footer">
      <div className="site-grid items-end gap-y-8">
        <Signature mode="play" className="footer__signature col-span-full md:col-span-4" />
        <p className="label col-span-full md:col-span-3 md:col-start-6">
          {site.name.first} {site.name.last}
        </p>
        <p className="label col-span-full -mt-6 text-muted md:col-span-2 md:mt-0">
          © {new Date().getFullYear()} · Built by me
        </p>
        <div className="col-span-full md:col-span-2 md:justify-self-end">
          <Magnetic>
            <button type="button" className="footer__top label" onClick={() => goTo('#top')}>
              Back to top <span aria-hidden="true">↑</span>
            </button>
          </Magnetic>
        </div>
      </div>
    </footer>
  )
}
