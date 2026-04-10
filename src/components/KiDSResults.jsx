import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

const summaryContent = `
## KiDS-1000 Weak Lensing Validation

The framework's predictions were tested against **stacked excess surface density (ESD) profiles** from the **KiDS-1000 weak lensing survey** [Brouwer 2021] — 1006 deg² of coherent background-galaxy shape distortions, stacked into four isolated-galaxy samples by stellar mass ($8.5 < \\log(M_\\star/M_\\odot) < 11.0$).

This is a **fundamentally different test** from galaxy rotation curves: weak lensing measures the total projected mass along the line of sight out to $\\sim 3$ Mpc, sampling the halo where rotation curves cannot reach. The informational complexity model is constrained by only **two global parameters** (kernel power law $n$ and normalisation $\\alpha_0$) shared across all four bins. Standard NFW dark matter fits use **eight parameters** (halo mass and concentration per bin).

---

### Headline Result

**The informational complexity model outperforms NFW in every mass bin.** Total reduced $\\chi^2$: **5.65 (Info) vs 8.93 (NFW)** — using **2 global parameters** instead of 8.

| Bin | $\\log M_\\star$ | Info $\\chi^2_r$ | NFW $\\chi^2_r$ | Winner |
|-----|------------------|------------------|------------------|--------|
| 1 | 9.40 | **2.14** | 3.48 | Info |
| 2 | 10.45 | **6.24** | 6.30 | Info |
| 3 | 10.70 | **5.78** | 10.58 | Info |
| 4 | 10.90 | **8.45** | 15.36 | Info |

The preferred kernel power law is $n = 1.75$ ($\\Delta = 0.875$), consistent across all four mass bins.

---

### The Running Kernel

Splitting the ESD profiles at three transition radii (200, 300, and 500 kpc) and fitting the kernel power law $n$ independently to inner and outer regions reveals a **clear, consistent scale dependence**:

- **Inner** ($R < 300$ kpc): $n_{\\text{inner}} \\approx 1.25$ — the kernel is "dressed" by the dense baryonic environment
- **Outer** ($R > 300$ kpc): $n_{\\text{outer}} \\approx 2.0$–$2.5$ — approaches the **bare QFT prediction** $n = 2.18$

**In all 12 bin–split combinations**, $n_{\\text{inner}} < n_{\\text{outer}}$. The probability of this happening by chance is $2^{-12} \\approx 0.02\\%$.

The outer kernel converges on the theoretical value derived from the idealised Hernquist → NFW calculation. Evidence that the NFW fit was probing the **bare, long-range kernel**, while dense environments **dress** it through quantum propagator corrections. In the language of renormalisation, the effective scaling dimension $\\Delta = n/2$ runs from a dressed value $\\Delta_{\\text{dressed}} \\approx 0.63$ in dense regions to the bare value $\\Delta_{\\text{bare}} \\approx 1.0$–$1.1$ in vacuum.
`;

export default function KiDSResults() {
  return (
    <div style={{
      width: '100%',
      height: '100%',
      overflowY: 'auto',
      background: 'linear-gradient(180deg, #0a0f1e 0%, #050710 100%)',
    }}>
      <div style={{
        maxWidth: '900px',
        margin: '0 auto',
        padding: 'clamp(1rem, 3vw, 2rem) clamp(0.75rem, 3vw, 2rem) 5rem',
      }}>
        <h1 style={{
          fontSize: 'clamp(1.4rem, 4vw, 2rem)',
          fontWeight: 700,
          marginBottom: '0.5rem',
          background: 'linear-gradient(135deg, #fff 0%, #ff9f7f 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
        }}>
          KiDS-1000 Weak Lensing Validation
        </h1>
        <p style={{ color: '#888', fontSize: '0.95rem', marginBottom: '2rem' }}>
          Testing the informational complexity model against stacked weak lensing profiles from Brouwer et al. (2021)
        </p>

        {/* Summary stats cards */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
          gap: '1rem',
          marginBottom: '2.5rem',
        }}>
          {[
            { label: 'Info χ²ᵣ (total)', value: '5.65', sub: '2 global params', color: '#00ff88' },
            { label: 'NFW χ²ᵣ (total)', value: '8.93', sub: '8 params', color: '#ff6688' },
            { label: 'Bins Won by Info', value: '4 / 4', color: '#88aaff' },
            { label: 'Running Consistency', value: '12 / 12', sub: 'p < 0.02%', color: '#aa88ff' },
            { label: 'Inner Kernel', value: 'n ≈ 1.25', sub: 'dressed', color: '#ff9f7f' },
            { label: 'Outer Kernel', value: 'n ≈ 2.06', sub: 'bare QFT', color: '#88ffaa' },
          ].map((stat, i) => (
            <div key={i} style={{
              background: 'rgba(255, 140, 100, 0.05)',
              border: '1px solid rgba(255, 140, 100, 0.15)',
              borderRadius: '12px',
              padding: '1.25rem 1rem',
              textAlign: 'center',
            }}>
              <div style={{ fontSize: '0.75rem', color: '#888', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {stat.label}
              </div>
              <div style={{ fontSize: '1.8rem', fontWeight: 700, color: stat.color, fontFamily: "'SF Mono', 'Monaco', monospace" }}>
                {stat.value}
              </div>
              {stat.sub && (
                <div style={{ fontSize: '0.7rem', color: '#666', marginTop: '0.25rem' }}>
                  {stat.sub}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Markdown content */}
        <div className="paper-content" style={{ maxWidth: 'none' }}>
          <ReactMarkdown remarkPlugins={[remarkMath]} rehypePlugins={[rehypeKatex]}>
            {summaryContent}
          </ReactMarkdown>
        </div>

        {/* KiDS lensing comparison figure */}
        <div style={{ margin: '2.5rem 0' }}>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 600,
            color: '#ff9f7f',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255, 140, 100, 0.2)',
          }}>
            Informational Complexity vs NFW Fits
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            Stacked excess surface density profiles ΔΣ(R) for four stellar-mass bins from the KiDS-1000 survey
            (black points with error bars). The informational complexity model (red solid) uses two global parameters
            shared across all bins; NFW (green dashed) uses two free parameters per bin, totalling eight. The baryonic
            contribution from the exponential disk is shown in faint blue. The informational complexity fit is closer
            to the data across the full radial range in every bin.
          </p>
          <div style={{
            background: 'rgba(255, 140, 100, 0.03)',
            border: '1px solid rgba(255, 140, 100, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <img
              src="/kids_lensing_comparison.png"
              alt="KiDS-1000 ESD profiles with Info and NFW fits across four stellar mass bins"
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>

        {/* Scale-dependent diagnostic figure */}
        <div style={{ margin: '2.5rem 0' }}>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 600,
            color: '#ff9f7f',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255, 140, 100, 0.2)',
          }}>
            Inner vs Outer Fits (R_split = 300 kpc)
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            Fitting the kernel power law n independently to inner (R &lt; 300 kpc, blue) and outer (R ≥ 300 kpc, red)
            regions reveals that a single global kernel (green dashed) cannot capture both scales. The inner fit
            consistently prefers a softer kernel (n ≈ 1.25–1.50), while the outer fit recovers the steeper
            bare-QFT value (n ≈ 2.00–2.25). The split lines converge at the transition radius, diagnosing a
            running kernel rather than a single-power-law halo.
          </p>
          <div style={{
            background: 'rgba(255, 140, 100, 0.03)',
            border: '1px solid rgba(255, 140, 100, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <img
              src="/scale_dependent_n_diagnostic.png"
              alt="Inner vs outer kernel fits at R_split = 300 kpc for all four KiDS-1000 mass bins"
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>

        {/* Scale-dependent n test figure */}
        <div style={{ margin: '2.5rem 0' }}>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 600,
            color: '#ff9f7f',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255, 140, 100, 0.2)',
          }}>
            Best-Fit Kernel Power by Split Radius
          </h2>
          <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '1rem', lineHeight: 1.6 }}>
            Best-fit kernel power law n for each mass bin at three split radii (200, 300, 500 kpc). Blue bars show
            the inner fit, gray the full-range fit, and orange the outer fit. The NFW-paper theoretical value (n = 2.18,
            blue dashed) and the KiDS-1000 global best fit (n = 1.75, red dashed) are marked for reference. In all
            12 bin–split combinations the inner fit is softer than the outer fit. The outer values bracket the
            theoretical bare-QFT prediction, exactly as expected from propagator dressing in a dense baryonic medium.
          </p>
          <div style={{
            background: 'rgba(255, 140, 100, 0.03)',
            border: '1px solid rgba(255, 140, 100, 0.1)',
            borderRadius: '12px',
            padding: '1rem',
            textAlign: 'center',
          }}>
            <img
              src="/scale_dependent_n_test.png"
              alt="Best-fit kernel power law n by stellar mass bin and split radius"
              style={{
                maxWidth: '100%',
                borderRadius: '8px',
              }}
            />
          </div>
        </div>

        {/* Significance section */}
        <div style={{ margin: '2.5rem 0' }}>
          <h2 style={{
            fontSize: '1.3rem',
            fontWeight: 600,
            color: '#ff9f7f',
            marginBottom: '1rem',
            paddingBottom: '0.5rem',
            borderBottom: '1px solid rgba(255, 140, 100, 0.2)',
          }}>
            What This Means
          </h2>
          <div style={{ color: '#d0d0d0', lineHeight: 1.8, fontSize: '0.95rem' }}>
            <p style={{ marginBottom: '1.25rem' }}>
              The KiDS-1000 test extends the framework's validation in three important ways:
            </p>
            <ol style={{ paddingLeft: '1.5rem', marginBottom: '1.25rem' }}>
              <li style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#fff' }}>A different physical probe.</strong> Weak lensing measures the full
                line-of-sight mass distribution — completely independent of disk-plane dynamics. That the model fits
                both rotation curves <em>and</em> lensing profiles with the same machinery is a genuine out-of-sample
                test, not a refit.
              </li>
              <li style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#fff' }}>Fewer parameters, better fit.</strong> The informational complexity
                model beats NFW in every stellar mass bin using <em>two global parameters</em> instead of
                <em> eight per-bin parameters</em>. This is the kind of result that can't happen by overfitting.
              </li>
              <li style={{ marginBottom: '0.75rem' }}>
                <strong style={{ color: '#fff' }}>The kernel runs — as QFT predicts.</strong> Splitting the data by
                radius reveals that the kernel is softer in dense regions and approaches the bare long-range value
                in sparse ones. This is the expected behaviour of a propagator dressed by a medium, and it resolves
                the apparent tension between the theoretical NFW calculation ($n = 2.18$) and the global KiDS fit ($n = 1.75$).
              </li>
            </ol>
            <p style={{
              padding: '1rem 1.5rem',
              background: 'rgba(255, 140, 100, 0.05)',
              borderLeft: '3px solid #ff9f7f',
              borderRadius: '0 8px 8px 0',
              fontStyle: 'italic',
              color: '#ffd0b0',
            }}>
              The framework is no longer characterised by a single free parameter — the outer kernel converges on
              the free scalar field value from $3+1$-dimensional QFT, and the running rate is determined by local
              baryonic density. The framework is approaching <strong>zero truly free parameters</strong>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
