"use client";

import Navbar from "../components/Navbar";
import Footer from "../components/Footer";
import Link from "next/link";
import { CheckCircle2, ArrowRight, ChevronDown, X } from "lucide-react";
import { useState } from "react";

const PLANS = [
    {
        name: "Free",
        monthlyPrice: "₹0",
        annualPrice: "₹0",
        period: "forever",
        features: [
            "5 clips/month",
            "2 videos/month",
            "720p output",
            "ClipMint watermark",
            "3 caption styles",
            "Email support",
        ],
        highlighted: false,
        cta: "Start Free",
    },
    {
        name: "Creator",
        monthlyPrice: "₹499",
        annualPrice: "₹399",
        period: "/month",
        features: [
            "50 clips/month",
            "5 videos/month",
            "1080p output",
            "No watermark",
            "All 9 caption styles",
            "Priority processing",
            "Email support",
        ],
        highlighted: true,
        cta: "Start Free Trial",
    },
    {
        name: "Pro",
        monthlyPrice: "₹1,499",
        annualPrice: "₹1,199",
        period: "/month",
        features: [
            "200 clips/month",
            "20 videos/month",
            "4K output",
            "No watermark",
            "All 9 caption styles",
            "Priority processing",
            "Full API access",
            "Discord notifications",
        ],
        highlighted: false,
        cta: "Start Free Trial",
    },
    {
        name: "Agency",
        monthlyPrice: "₹4,999",
        annualPrice: "₹3,999",
        period: "/month",
        features: [
            "Unlimited clips",
            "Unlimited videos",
            "4K output",
            "White-label option",
            "Team accounts",
            "n8n integration",
            "Batch processing",
            "Dedicated support",
        ],
        highlighted: false,
        cta: "Contact Sales",
    },
];

const BILLING_FAQ = [
    {
        q: "What payment methods do you accept?",
        a: "We accept all major credit/debit cards, UPI, net banking, and wallets via Razorpay. All payments are securely processed.",
    },
    {
        q: "Can I cancel anytime?",
        a: "Yes. Cancel from your Settings page at any time. You'll retain access until the end of your current billing cycle.",
    },
    {
        q: "What's the refund policy?",
        a: "We offer a 7-day refund window from the date of your first payment. Email ClipMint.Billing@gmail.com with your refund request.",
    },
    {
        q: "Do I need a credit card for the free plan?",
        a: "No. The free plan requires no credit card. Just sign up with your email or Google account and start clipping.",
    },
    {
        q: "Can I switch plans?",
        a: "Yes. Upgrade or downgrade anytime from your dashboard Settings. Changes take effect at the start of your next billing cycle.",
    },
];

export default function PricingPage() {
    const [annual, setAnnual] = useState(false);
    const [openFaq, setOpenFaq] = useState<number | null>(null);

    return (
        <main>
            <Navbar />

            <div
                style={{
                    maxWidth: 1200,
                    margin: "0 auto",
                    padding: "140px 24px 80px",
                }}
            >
                <div style={{ textAlign: "center", marginBottom: 48 }}>
                    <h1
                        style={{
                            fontSize: "clamp(32px, 5vw, 48px)",
                            fontWeight: 800,
                            marginBottom: 16,
                        }}
                    >
                        Simple, <span className="gradient-text">Transparent</span> Pricing
                    </h1>
                    <p
                        style={{
                            fontSize: 18,
                            color: "var(--text-secondary)",
                            maxWidth: 500,
                            margin: "0 auto 32px",
                            lineHeight: 1.6,
                        }}
                    >
                        Start free. Scale as you grow. No hidden fees.
                    </p>

                    {/* Toggle */}
                    <div
                        style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 16,
                            padding: "6px",
                            borderRadius: 12,
                            background: "var(--bg-secondary)",
                            border: "1px solid var(--border-subtle)",
                        }}
                    >
                        <button
                            onClick={() => setAnnual(false)}
                            style={{
                                padding: "10px 24px",
                                borderRadius: 8,
                                border: "none",
                                background: !annual
                                    ? "var(--accent-primary)"
                                    : "transparent",
                                color: !annual
                                    ? "white"
                                    : "var(--text-secondary)",
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                fontFamily: "inherit",
                            }}
                        >
                            Monthly
                        </button>
                        <button
                            onClick={() => setAnnual(true)}
                            style={{
                                padding: "10px 24px",
                                borderRadius: 8,
                                border: "none",
                                background: annual
                                    ? "var(--accent-primary)"
                                    : "transparent",
                                color: annual
                                    ? "white"
                                    : "var(--text-secondary)",
                                fontWeight: 600,
                                fontSize: 14,
                                cursor: "pointer",
                                transition: "all 0.3s ease",
                                fontFamily: "inherit",
                            }}
                        >
                            Annual{" "}
                            <span
                                style={{
                                    fontSize: 11,
                                    fontWeight: 700,
                                    color: annual
                                        ? "rgba(255,255,255,0.8)"
                                        : "var(--accent-green)",
                                    marginLeft: 4,
                                }}
                            >
                                Save 20%
                            </span>
                        </button>
                    </div>
                </div>

                {/* Plans */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                        gap: 24,
                        marginBottom: 80,
                    }}
                >
                    {PLANS.map((plan) => (
                        <div
                            key={plan.name}
                            className="glass-card"
                            style={{
                                padding: 32,
                                border: plan.highlighted
                                    ? "2px solid var(--accent-primary)"
                                    : undefined,
                                position: "relative",
                            }}
                        >
                            {plan.highlighted && (
                                <div
                                    style={{
                                        position: "absolute",
                                        top: -12,
                                        left: "50%",
                                        transform: "translateX(-50%)",
                                        background: "var(--accent-primary)",
                                        color: "white",
                                        padding: "4px 16px",
                                        borderRadius: 20,
                                        fontSize: 11,
                                        fontWeight: 700,
                                        letterSpacing: 0.8,
                                        textTransform: "uppercase",
                                    }}
                                >
                                    Most Popular
                                </div>
                            )}
                            <h3
                                style={{
                                    fontSize: 20,
                                    fontWeight: 700,
                                    marginBottom: 12,
                                }}
                            >
                                {plan.name}
                            </h3>
                            <div
                                style={{
                                    display: "flex",
                                    alignItems: "baseline",
                                    gap: 4,
                                    marginBottom: 24,
                                }}
                            >
                                <span
                                    className="gradient-text"
                                    style={{ fontSize: 36, fontWeight: 800 }}
                                >
                                    {annual ? plan.annualPrice : plan.monthlyPrice}
                                </span>
                                <span
                                    style={{
                                        color: "var(--text-muted)",
                                        fontSize: 14,
                                    }}
                                >
                                    {plan.period}
                                </span>
                            </div>
                            <ul
                                style={{
                                    listStyle: "none",
                                    display: "flex",
                                    flexDirection: "column",
                                    gap: 12,
                                    marginBottom: 28,
                                }}
                            >
                                {plan.features.map((f) => (
                                    <li
                                        key={f}
                                        style={{
                                            display: "flex",
                                            alignItems: "center",
                                            gap: 10,
                                            color: "var(--text-secondary)",
                                            fontSize: 14,
                                        }}
                                    >
                                        <CheckCircle2
                                            size={16}
                                            style={{
                                                color: "var(--accent-green)",
                                                flexShrink: 0,
                                            }}
                                        />
                                        {f}
                                    </li>
                                ))}
                            </ul>
                            <Link
                                href={plan.cta === "Contact Sales" ? "/contact" : "/login"}
                                className={
                                    plan.highlighted ? "btn-primary" : "btn-secondary"
                                }
                                style={{
                                    width: "100%",
                                    justifyContent: "center",
                                    textDecoration: "none",
                                }}
                            >
                                {plan.cta} <ArrowRight size={16} />
                            </Link>
                        </div>
                    ))}
                </div>

                {/* Feature comparison table */}
                <div style={{ marginBottom: 80 }}>
                    <h2
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            textAlign: "center",
                            marginBottom: 32,
                        }}
                    >
                        Compare <span className="gradient-text">Plans</span>
                    </h2>
                    <div
                        className="glass-card"
                        style={{ overflowX: "auto", padding: 0 }}
                    >
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                fontSize: 14,
                                minWidth: 600,
                            }}
                        >
                            <thead>
                                <tr
                                    style={{
                                        borderBottom: "1px solid var(--border-subtle)",
                                    }}
                                >
                                    <th
                                        style={{
                                            textAlign: "left",
                                            padding: "16px 20px",
                                            color: "var(--text-muted)",
                                            fontWeight: 600,
                                        }}
                                    >
                                        Feature
                                    </th>
                                    {PLANS.map((p) => (
                                        <th
                                            key={p.name}
                                            style={{
                                                textAlign: "center",
                                                padding: "16px 12px",
                                                color:
                                                    p.highlighted
                                                        ? "var(--accent-secondary)"
                                                        : "var(--text-primary)",
                                                fontWeight: 700,
                                            }}
                                        >
                                            {p.name}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {[
                                    ["Clips/month", "5", "50", "200", "Unlimited"],
                                    ["Videos/month", "2", "5", "20", "Unlimited"],
                                    ["Output quality", "720p", "1080p", "4K", "4K"],
                                    ["Caption styles", "3", "9", "9", "9"],
                                    ["Watermark", "Yes", "No", "No", "No"],
                                    ["API access", "—", "—", "✓", "✓"],
                                    ["Priority processing", "—", "✓", "✓", "✓"],
                                    ["Team accounts", "—", "—", "—", "✓"],
                                    ["White-label", "—", "—", "—", "✓"],
                                ].map((row, i) => (
                                    <tr
                                        key={row[0]}
                                        style={{
                                            borderBottom:
                                                i < 8
                                                    ? "1px solid rgba(42, 42, 69, 0.5)"
                                                    : undefined,
                                        }}
                                    >
                                        <td
                                            style={{
                                                padding: "14px 20px",
                                                color: "var(--text-secondary)",
                                                fontWeight: 500,
                                            }}
                                        >
                                            {row[0]}
                                        </td>
                                        {row.slice(1).map((val, j) => (
                                            <td
                                                key={j}
                                                style={{
                                                    textAlign: "center",
                                                    padding: "14px 12px",
                                                    color:
                                                        val === "✓"
                                                            ? "var(--accent-green)"
                                                            : val === "—"
                                                                ? "var(--text-muted)"
                                                                : "var(--text-primary)",
                                                    fontWeight: val === "✓" ? 700 : 400,
                                                }}
                                            >
                                                {val}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Billing FAQ */}
                <div style={{ maxWidth: 700, margin: "0 auto" }}>
                    <h2
                        style={{
                            fontSize: 28,
                            fontWeight: 800,
                            textAlign: "center",
                            marginBottom: 32,
                        }}
                    >
                        Billing <span className="gradient-text">FAQ</span>
                    </h2>
                    <div
                        style={{
                            display: "flex",
                            flexDirection: "column",
                            gap: 12,
                        }}
                    >
                        {BILLING_FAQ.map((faq, i) => (
                            <div
                                key={i}
                                className={`faq-item ${openFaq === i ? "open" : ""}`}
                            >
                                <button
                                    className="faq-question"
                                    onClick={() => setOpenFaq(openFaq === i ? null : i)}
                                >
                                    {faq.q}
                                    <ChevronDown size={18} className="faq-chevron" />
                                </button>
                                <div className="faq-answer">{faq.a}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <Footer />
        </main>
    );
}
