/**
 * Example: Check portfolio state, display Greeks, margin utilization,
 * and calculate risk for a hypothetical position change.
 *
 * Usage:
 *   KYAN_API_KEY=your-key npx ts-node examples/check-portfolio.ts
 */

import { KyanClient } from "../../kyan-trading/src/client.js";
import {
  getAccountState,
  getPositions,
  calculateUserRisk,
} from "../src/index.js";

async function main() {
  const apiKey = process.env.KYAN_API_KEY;
  if (!apiKey) {
    console.error("Set KYAN_API_KEY environment variable");
    process.exit(1);
  }

  const account = process.env.KYAN_ACCOUNT;
  if (!account) {
    console.error("Set KYAN_ACCOUNT environment variable (smart account address)");
    process.exit(1);
  }

  const client = new KyanClient({ apiKey });

  // ── 1. Fetch account state ────────────────────────────────────────────

  console.log("=== Account State ===\n");
  const state = await getAccountState(client, account);

  for (const ma of state.margin_accounts) {
    console.log(`--- ${ma.pair} ---`);
    console.log(`  Equity:          ${ma.equity.toFixed(2)} USDC`);
    console.log(`  Margin Account:  ${ma.margin_account.toFixed(2)} USDC`);
    console.log(`  Unrealised PnL:  ${ma.unrealised_pnl.toFixed(2)} USDC`);
    console.log(`  Initial Margin:  ${ma.im.toFixed(2)}`);
    console.log(`  Maint. Margin:   ${ma.mm.toFixed(2)}`);

    // Margin utilization: how much of the equity is used by IM
    const utilization = ma.equity > 0 ? (ma.im / ma.equity) * 100 : 0;
    console.log(`  IM Utilization:  ${utilization.toFixed(1)}%`);

    // Liquidation warning
    if (ma.equity > 0 && ma.equity < ma.mm * 1.1) {
      console.log(`  *** WARNING: Equity within 10% of maintenance margin! ***`);
    }

    // Risk breakdown
    console.log(`  Risk Breakdown:`);
    console.log(`    Matrix Risk:   ${ma.matrix_risk.toFixed(2)}`);
    console.log(`    Delta Risk:    ${ma.delta_risk.toFixed(2)}`);
    console.log(`    Roll Risk:     ${ma.roll_risk.toFixed(2)}`);

    // Portfolio Greeks
    const g = ma.portfolio_greeks;
    console.log(`  Portfolio Greeks:`);
    console.log(`    Delta: ${g.delta.toFixed(4)}`);
    console.log(`    Gamma: ${g.gamma.toFixed(6)}`);
    console.log(`    Vega:  ${g.vega.toFixed(4)}`);
    console.log(`    Theta: ${g.theta.toFixed(4)}`);
    console.log(`    Rho:   ${g.rho.toFixed(4)}`);

    // Positions
    if (ma.positions.length > 0) {
      console.log(`  Positions (${ma.positions.length}):`);
      for (const pos of ma.positions) {
        const side = pos.size > 0 ? "LONG" : "SHORT";
        console.log(
          `    ${side} ${Math.abs(pos.size)} ${pos.instrument}` +
          `  mark=${pos.mark_price.toFixed(2)}` +
          `  avg=${pos.average_price.toFixed(2)}` +
          (pos.instrument_type === "option" ? `  iv=${(pos.mark_iv * 100).toFixed(1)}%` : ""),
        );
      }
    } else {
      console.log(`  No open positions.`);
    }
    console.log();
  }

  // ── 2. Fetch all positions ────────────────────────────────────────────

  console.log("=== All Positions ===\n");
  const positionsResp = await getPositions(client);
  let totalPositions = 0;
  for (const ma of positionsResp.margin_accounts) {
    totalPositions += ma.positions.length;
  }
  console.log(`Total positions across all accounts: ${totalPositions}\n`);

  // ── 3. Calculate risk for a hypothetical position change ──────────────

  console.log("=== Hypothetical Risk Calculation ===\n");
  console.log("Scenario: Add 1 long ETH perpetual + sell 5 ETH calls\n");

  const risk = await calculateUserRisk(client, {
    pair: "ETH_USDC",
    positions: [
      {
        instrument_name: "ETH_USDC-PERPETUAL",
        size: 1,
        direction: "buy",
      },
      {
        instrument_name: "ETH_USDC-31OCT25-4000-C",
        size: 5,
        direction: "sell",
      },
    ],
  });

  console.log(`Hypothetical Margin Requirements:`);
  console.log(`  Initial Margin:  ${risk.im.toFixed(2)}`);
  console.log(`  Maint. Margin:   ${risk.mm.toFixed(2)}`);
  console.log(`  Matrix Risk:     ${risk.matrix_risk.toFixed(2)}`);
  console.log(`  Delta Risk:      ${risk.delta_risk.toFixed(2)}`);
  console.log(`  Roll Risk:       ${risk.roll_risk.toFixed(2)}`);

  console.log(`\nHypothetical Portfolio Greeks:`);
  const pg = risk.portfolio_greeks;
  console.log(`  Delta: ${pg.delta.toFixed(4)}`);
  console.log(`  Gamma: ${pg.gamma.toFixed(6)}`);
  console.log(`  Vega:  ${pg.vega.toFixed(4)}`);
  console.log(`  Theta: ${pg.theta.toFixed(4)}`);
  console.log(`  Rho:   ${pg.rho.toFixed(4)}`);

  if (risk.future_settlement_projections.length > 0) {
    console.log(`\nSettlement Projections:`);
    for (const proj of risk.future_settlement_projections) {
      console.log(`  ${proj.settlement_date}:`);
      console.log(`    IM=${proj.im.toFixed(2)}  MM=${proj.mm.toFixed(2)}`);
      console.log(
        `    matrix=${proj.matrix_risk.toFixed(2)}  delta=${proj.delta_risk.toFixed(2)}  roll=${proj.roll_risk.toFixed(2)}`,
      );
      console.log(
        `    Greeks: d=${proj.delta.toFixed(4)} g=${proj.gamma.toFixed(6)} v=${proj.vega.toFixed(4)} t=${proj.theta.toFixed(4)} r=${proj.rho.toFixed(4)}`,
      );
    }
  }
}

main().catch((err) => {
  console.error("Error:", err);
  process.exit(1);
});
