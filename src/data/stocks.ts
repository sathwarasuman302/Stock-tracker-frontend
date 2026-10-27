export type StockItem = {
	id: string;
	symbolKey: string;
	exchangeKey: string;
	sectorKey: string;
	priceKey: string;
	changeKey: string;
	basePrice: number;
	price: number;
	changePercent: number;
	dataSource?: "simulated" | "provider" | "delayed" | "fallback";
	lastUpdated?: number | null;
};

export const featuredStocks: StockItem[] = [
	{
		id: "2",
		symbolKey: "stockTcs",
		exchangeKey: "exchangeBse",
		sectorKey: "sectorTech",
		priceKey: "stockTcsPrice",
		changeKey: "stockTcsChange",
		basePrice: 2280.0,
		price: 2280.0,
		changePercent: 0.55,
	},
	{
		id: "3",
		symbolKey: "stockNifty",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorIndex",
		priceKey: "stockNiftyPrice",
		changeKey: "stockNiftyChange",
		basePrice: 25000,
		price: 25000,
		changePercent: 0,
	},
	{
		id: "1",
		symbolKey: "stockReliance",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorEnergy",
		priceKey: "stockReliancePrice",
		changeKey: "stockRelianceChange",
		basePrice: 2485.3,
		price: 2485.3,
		changePercent: 1.18,
	},
	{
		id: "4",
		symbolKey: "stockHdfcBank",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorBanking",
		priceKey: "stockHdfcBankPrice",
		changeKey: "stockHdfcBankChange",
		basePrice: 1725.4,
		price: 1725.4,
		changePercent: 0.42,
	},
	{
		id: "5",
		symbolKey: "stockIciciBank",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorBanking",
		priceKey: "stockIciciBankPrice",
		changeKey: "stockIciciBankChange",
		basePrice: 1248.75,
		price: 1248.75,
		changePercent: -0.28,
	},
	{
		id: "6",
		symbolKey: "stockItc",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorFmcg",
		priceKey: "stockItcPrice",
		changeKey: "stockItcChange",
		basePrice: 465.2,
		price: 465.2,
		changePercent: 0.91,
	},
	{
		id: "7",
		symbolKey: "stockInfy",
		exchangeKey: "exchangeNse",
		sectorKey: "sectorTech",
		priceKey: "stockInfyPrice",
		changeKey: "stockInfyChange",
		basePrice: 1500,
		price: 1500,
		changePercent: 0,
	},
	{
		id: "9",
		symbolKey: "stockBitcoin",
		exchangeKey: "exchangeCrypto",
		sectorKey: "sectorCrypto",
		priceKey: "stockBitcoinPrice",
		changeKey: "stockBitcoinChange",
		basePrice: 0,
		price: 0,
		changePercent: 0,
	},
];

export const markets = [
	{
		id: "nse",
		nameKey: "marketNse",
		descKey: "marketNseDesc",
	},
	{
		id: "bse",
		nameKey: "marketBse",
		descKey: "marketBseDesc",
	},
	{
		id: "nasdaq",
		nameKey: "marketNasdaq",
		descKey: "marketNasdaqDesc",
	},
] as const;
