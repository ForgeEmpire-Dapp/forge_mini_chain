/**
 * @fileoverview Metrics collection and exposition for Prometheus monitoring
 */
import client from 'prom-client';
// Create a Registry which registers the metrics
const register = new client.Registry();
// Add a default label which is added to all metrics
register.setDefaultLabels({
    app: 'forge-mini-chain'
});
// Enable the collection of default metrics
client.collectDefaultMetrics({ register });
// Custom metrics
const blockHeightGauge = new client.Gauge({
    name: 'forge_block_height',
    help: 'Current block height of the blockchain',
    registers: [register]
});
const mempoolSizeGauge = new client.Gauge({
    name: 'forge_mempool_size',
    help: 'Current number of transactions in mempool',
    registers: [register]
});
const totalTransactionsCounter = new client.Counter({
    name: 'forge_transactions_total',
    help: 'Total number of transactions processed',
    registers: [register]
});
const totalBlocksCounter = new client.Counter({
    name: 'forge_blocks_total',
    help: 'Total number of blocks produced',
    registers: [register]
});
const evmContractCounter = new client.Gauge({
    name: 'forge_evm_contracts_total',
    help: 'Total number of deployed EVM contracts',
    registers: [register]
});
const transactionGasUsedHistogram = new client.Histogram({
    name: 'forge_transaction_gas_used',
    help: 'Gas used by transactions',
    buckets: [21000, 50000, 100000, 200000, 500000, 1000000],
    registers: [register]
});
const blockGasUsedHistogram = new client.Histogram({
    name: 'forge_block_gas_used',
    help: 'Gas used by blocks',
    buckets: [100000, 500000, 1000000, 2000000, 5000000, 10000000],
    registers: [register]
});
const apiRequestDurationHistogram = new client.Histogram({
    name: 'forge_api_request_duration_seconds',
    help: 'Duration of API requests in seconds',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10],
    registers: [register]
});
// Register all metrics
register.registerMetric(blockHeightGauge);
register.registerMetric(mempoolSizeGauge);
register.registerMetric(totalTransactionsCounter);
register.registerMetric(totalBlocksCounter);
register.registerMetric(evmContractCounter);
register.registerMetric(transactionGasUsedHistogram);
register.registerMetric(blockGasUsedHistogram);
register.registerMetric(apiRequestDurationHistogram);
// Export metrics
export { register, blockHeightGauge, mempoolSizeGauge, totalTransactionsCounter, totalBlocksCounter, evmContractCounter, transactionGasUsedHistogram, blockGasUsedHistogram, apiRequestDurationHistogram };
