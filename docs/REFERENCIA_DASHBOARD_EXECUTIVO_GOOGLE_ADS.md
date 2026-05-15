import React from "react";
import {
  BarChart,
  Bar,
  Line,
  LineChart,
  ComposedChart,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  CalendarDays,
  MousePointerClick,
  Eye,
  Target,
  DollarSign,
  Percent,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  BarChart3,
  Lightbulb,
  ClipboardCheck,
  Info,
} from "lucide-react";

const BLUE = "#2563EB";
const BLUE_LIGHT = "#BFDBFE";
const GREEN = "#16A34A";
const RED = "#DC2626";
const TEXT = "#111827";
const MUTED = "#6B7280";

const kpis = [
  {
    label: "Investimento",
    value: "R$ 190,04",
    delta: "-29,9%",
    positive: false,
    icon: DollarSign,
  },
  {
    label: "Impressões",
    value: "191",
    delta: "-42,1%",
    positive: false,
    icon: Eye,
  },
  {
    label: "Cliques",
    value: "31",
    delta: "-6,1%",
    positive: false,
    icon: MousePointerClick,
  },
  {
    label: "CTR",
    value: "16,2%",
    delta: "+62,3%",
    positive: true,
    icon: Percent,
  },
  {
    label: "CPC médio",
    value: "R$ 6,13",
    delta: "-25,3%",
    positive: true,
    icon: DollarSign,
  },
  {
    label: "Conversões",
    value: "0",
    delta: "-100,0%",
    positive: false,
    icon: Target,
  },
  {
    label: "Custo/conv.",
    value: "R$ 0,00",
    delta: "-100,0%",
    positive: false,
    icon: DollarSign,
  },
];

const dailyData = [
  { date: "04 mai", day: "Dom", investimento: 34, cliques: 6 },
  { date: "05 mai", day: "Seg", investimento: 24, cliques: 4 },
  { date: "06 mai", day: "Ter", investimento: 29, cliques: 6 },
  { date: "07 mai", day: "Qua", investimento: 44, cliques: 8 },
  { date: "08 mai", day: "Qui", investimento: 28, cliques: 5 },
  { date: "09 mai", day: "Sex", investimento: 21, cliques: 2 },
  { date: "10 mai", day: "Sáb", investimento: 10, cliques: 0 },
];

const comparisonData = [
  { metrica: "Investimento", atual: 190.04, anterior: 271.39 },
  { metrica: "Impressões", atual: 191, anterior: 330 },
  { metrica: "Cliques", atual: 31, anterior: 33 },
  { metrica: "Conversões", atual: 0, anterior: 1 },
];

const deviceData = [
  { name: "Desktop", value: 22, percent: "70,0%" },
  { name: "Mobile", value: 9, percent: "30,0%" },
];

const COLORS = [BLUE, BLUE_LIGHT];

function Card({ children, className = "" }) {
  return (
    <div className={`rounded-2xl border border-gray-200 bg-white shadow-sm ${className}`}>
      {children}
    </div>
  );
}

function KpiCard({ item }) {
  const Icon = item.icon;
  const DeltaIcon = item.positive ? TrendingUp : TrendingDown;
  const deltaColor = item.positive ? GREEN : RED;

  return (
    <Card className="h-[150px] p-5">
      <div className="flex items-start justify-between">
        <div className="text-[17px] font-semibold text-gray-900">{item.label}</div>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
          <Icon size={19} strokeWidth={2.4} />
        </div>
      </div>
      <div className="mt-3 text-[35px] font-bold leading-none text-gray-950">{item.value}</div>
      <div className="mt-4 flex items-center gap-1 text-[17px] font-bold" style={{ color: deltaColor }}>
        <DeltaIcon size={18} strokeWidth={3} />
        <span>{item.delta}</span>
      </div>
      <div className="mt-1 text-[15px] text-gray-500">vs. período anterior</div>
    </Card>
  );
}

function SectionTitle({ icon: Icon, title }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      {Icon && (
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-600 text-white">
          <Icon size={19} />
        </div>
      )}
      <h2 className="text-[22px] font-bold text-gray-950">{title}</h2>
    </div>
  );
}

const tooltipFormatter = (value, name) => {
  if (name === "investimento" || name === "atual" || name === "anterior") {
    return [`${Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 })}`, name];
  }
  return [value, name];
};

export default function DashboardGoogleAdsResumoExecutivo() {
  return (
    <main className="min-h-screen bg-[#F7F9FC] p-6 font-sans text-gray-950">
      <div className="mx-auto h-[1080px] w-[1920px] overflow-hidden rounded-3xl border border-gray-200 bg-[#F7F9FC] shadow-xl">
        <header className="flex h-[116px] items-center justify-between border-b border-gray-200 bg-white px-10">
          <div className="flex items-center gap-10">
            <div className="text-[40px] font-extrabold tracking-tight text-blue-600">Studio 4x</div>
            <div className="h-[72px] w-px bg-gray-300" />
            <div>
              <h1 className="text-[38px] font-extrabold tracking-tight text-gray-950">
                Dashboard Google Ads — Resumo Executivo
              </h1>
              <p className="mt-1 text-[20px] text-gray-500">
                Visão geral da performance da campanha na última semana
              </p>
            </div>
          </div>

          <div className="flex h-16 w-[420px] items-center justify-between rounded-2xl border border-gray-300 bg-white px-6 text-[18px] font-semibold text-gray-800 shadow-sm">
            <div className="flex items-center gap-3">
              <CalendarDays size={22} />
              <span>04 mai 2026 - 10 mai 2026</span>
            </div>
            <span className="text-gray-500">▾</span>
          </div>
        </header>

        <section className="grid grid-cols-7 gap-5 px-6 pt-7">
          {kpis.map((item) => (
            <KpiCard key={item.label} item={item} />
          ))}
        </section>

        <section className="grid grid-cols-[1.45fr_1fr_0.9fr] gap-5 px-6 pt-6">
          <Card className="h-[360px] p-6">
            <h2 className="mb-3 text-[21px] font-bold text-gray-950">Evolução diária de investimento e cliques</h2>
            <ResponsiveContainer width="100%" height={282}>
              <ComposedChart data={dailyData} margin={{ top: 8, right: 22, bottom: 0, left: 4 }}>
                <CartesianGrid stroke="#E5E7EB" vertical={false} />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value, index) => `${value}\n${dailyData[index]?.day ?? ""}`}
                  tick={{ fill: TEXT, fontSize: 14 }}
                  tickLine={false}
                  axisLine={{ stroke: "#CBD5E1" }}
                />
                <YAxis
                  yAxisId="left"
                  tick={{ fill: MUTED, fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Investimento (R$)", angle: -90, position: "insideLeft", fill: TEXT, fontSize: 15 }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fill: MUTED, fontSize: 14 }}
                  tickLine={false}
                  axisLine={false}
                  label={{ value: "Cliques", angle: 90, position: "insideRight", fill: TEXT, fontSize: 15 }}
                />
                <Tooltip formatter={tooltipFormatter} />
                <Legend verticalAlign="top" align="left" iconType="circle" />
                <Bar yAxisId="left" dataKey="investimento" name="Investimento (R$)" fill={BLUE_LIGHT} radius={[8, 8, 0, 0]} barSize={42} />
                <Line yAxisId="right" type="monotone" dataKey="cliques" name="Cliques" stroke={BLUE} strokeWidth={4} dot={{ r: 6, fill: BLUE }} />
              </ComposedChart>
            </ResponsiveContainer>
          </Card>

          <Card className="h-[360px] p-6">
            <h2 className="mb-3 text-[21px] font-bold text-gray-950">Comparativo: semana atual x anterior</h2>
            <ResponsiveContainer width="100%" height={282}>
              <BarChart data={comparisonData} margin={{ top: 18, right: 8, bottom: 0, left: -12 }}>
                <CartesianGrid stroke="#E5E7EB" vertical={false} />
                <XAxis dataKey="metrica" tick={{ fill: TEXT, fontSize: 13 }} tickLine={false} axisLine={{ stroke: "#CBD5E1" }} />
                <YAxis tick={{ fill: MUTED, fontSize: 13 }} tickLine={false} axisLine={false} />
                <Tooltip formatter={tooltipFormatter} />
                <Legend verticalAlign="top" align="left" iconType="circle" />
                <Bar dataKey="atual" name="Semana atual" fill={BLUE} radius={[8, 8, 0, 0]} barSize={32} />
                <Bar dataKey="anterior" name="Semana anterior" fill={BLUE_LIGHT} radius={[8, 8, 0, 0]} barSize={32} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card className="h-[360px] p-6">
            <h2 className="mb-3 text-[21px] font-bold text-gray-950">Cliques por dispositivo</h2>
            <div className="relative h-[286px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={deviceData}
                    innerRadius={78}
                    outerRadius={124}
                    paddingAngle={2}
                    dataKey="value"
                    stroke="#FFFFFF"
                    strokeWidth={3}
                  >
                    {deviceData.map((entry, index) => (
                      <Cell key={`cell-${entry.name}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
              <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
                <div className="text-center">
                  <div className="text-[39px] font-extrabold leading-none">31</div>
                  <div className="mt-1 text-[15px] leading-tight text-gray-500">Total de<br />Cliques</div>
                </div>
              </div>
              <div className="absolute left-6 top-[116px] text-[20px] font-bold text-gray-950">
                30,0%
                <div className="text-[15px] font-medium text-gray-700">Mobile (9)</div>
              </div>
              <div className="absolute right-3 top-[150px] text-right text-[21px] font-bold text-blue-700">
                70,0%
                <div className="text-[15px] font-semibold text-blue-700">Desktop (22)</div>
              </div>
            </div>
          </Card>
        </section>

        <section className="grid grid-cols-[1fr_1fr] gap-5 px-6 pt-6">
          <Card className="h-[278px] p-6">
            <SectionTitle icon={Lightbulb} title="Resumo da semana" />
            <div className="space-y-5 pl-2">
              <div className="grid grid-cols-[64px_1fr] items-center gap-4 border-b border-gray-200 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                  <BarChart3 size={24} />
                </div>
                <p className="text-[19px] leading-snug text-gray-900">
                  O alcance caiu, acompanhando a redução nas impressões e no investimento consumido.
                </p>
              </div>
              <div className="grid grid-cols-[64px_1fr] items-center gap-4 border-b border-gray-200 pb-5">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-700">
                  <TrendingUp size={24} />
                </div>
                <p className="text-[19px] leading-snug text-gray-900">
                  Apesar do menor volume, a CTR subiu significativamente, indicando anúncios mais relevantes para quem visualizou.
                </p>
              </div>
              <div className="grid grid-cols-[64px_1fr] items-center gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-red-100 text-red-600">
                  <AlertTriangle size={24} />
                </div>
                <p className="text-[19px] leading-snug text-gray-900">
                  O principal ponto de atenção continua sendo a ausência de conversões registradas no período.
                </p>
              </div>
            </div>
          </Card>

          <Card className="h-[278px] p-6">
            <SectionTitle icon={ClipboardCheck} title="Próximos passos" />
            <div className="mt-3 divide-y divide-gray-200">
              {[
                "revisar eventos de conversão",
                "analisar termos de pesquisa",
                "ajustar lances e segmentação",
                "monitorar qualidade da página de destino",
              ].map((step) => (
                <div key={step} className="flex items-center gap-4 py-4 text-[19px] text-gray-900">
                  <CheckCircle2 size={28} className="text-blue-600" />
                  <span>{step}</span>
                </div>
              ))}
            </div>
          </Card>
        </section>

        <footer className="mx-6 mt-5 flex h-[52px] items-center justify-between rounded-2xl border border-gray-200 bg-white px-6 text-[15px] text-gray-500 shadow-sm">
          <div className="flex items-center gap-3">
            <Info size={22} className="text-blue-600" />
            <span>Comparação com o período anterior: 27 abr 2026 - 03 mai 2026</span>
          </div>
          <span>Valores sujeitos a alterações</span>
        </footer>
      </div>
    </main>
  );
}
