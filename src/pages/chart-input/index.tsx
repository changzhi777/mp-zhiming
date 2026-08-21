// mp-zhiming/src/pages/chart-input/index.tsx · 排盘输入（M17 · P1 + C2 + C3）
// 公/农历支持（C2）+ 省/市/县三级联动（C3）；提交后 castChart → reLaunch chart-result
import { Button, Input, Picker, Text, View } from "@tarojs/components"
import Taro from "@tarojs/taro"
import { useEffect, useState } from "react"
import { type LocationItem, castChart, getLocations } from "../../lib/api"
import { t } from "../../lib/i18n"

const HOURS = [
  "23-01",
  "01-03",
  "03-05",
  "05-07",
  "07-09",
  "09-11",
  "11-13",
  "13-15",
  "15-17",
  "17-19",
  "19-21",
  "21-23",
]
const now = new Date()

export default function ChartInput() {
  const [year, setYear] = useState(now.getFullYear())
  const [month, setMonth] = useState(now.getMonth() + 1)
  const [day, setDay] = useState(now.getDate())
  const [hour, setHour] = useState(0) // index into HOURS
  const [gender, setGender] = useState<0 | 1>(0)
  // C2：农历支持
  const [calendar, setCalendar] = useState<"solar" | "lunar">("solar")
  const [isLeapMonth, setIsLeapMonth] = useState(false)
  // C3：行政区划三级联动
  const [provinces, setProvinces] = useState<LocationItem[]>([])
  const [cities, setCities] = useState<LocationItem[]>([])
  const [counties, setCounties] = useState<LocationItem[]>([])
  const [pIdx, setPIdx] = useState(0)
  const [cIdx, setCIIdx] = useState(0)
  const [kIdx, setKIdx] = useState(0)
  const [busy, setBusy] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // 拉省
  useEffect(() => {
    getLocations(undefined, 1)
      .then(setProvinces)
      .catch((e) => setErr(e instanceof Error ? e.message : String(e)))
  }, [])

  // 选省 → 拉市
  useEffect(() => {
    const p = provinces[pIdx]
    if (!p) return
    setCIIdx(0)
    setKIdx(0)
    setCounties([])
    getLocations(p.code, 2)
      .then(setCities)
      .catch((e) => console.warn("[getLocations cities]", e))
  }, [pIdx, provinces])

  // 选市 → 拉县
  useEffect(() => {
    const c = cities[cIdx]
    if (!c) return
    setKIdx(0)
    getLocations(c.code, 3)
      .then(setCounties)
      .catch((e) => console.warn("[getLocations counties]", e))
  }, [cIdx, cities])

  const submit = async () => {
    setBusy(true)
    setErr(null)
    try {
      const h = Number(HOURS[hour].split("-")[0])
      const loc = counties[kIdx] ?? cities[cIdx] ?? provinces[pIdx]
      const birth = {
        calendar,
        isLeapMonth,
        year,
        month,
        day,
        hour: h,
        minute: 0,
        gender,
        location: {
          city: loc?.name ?? "北京",
          latitude: loc?.lat ?? undefined,
          longitude: loc?.lon ?? undefined,
        },
        useTrueSolarTime: true,
        sect: 1 as const,
        dstAdjusted: false,
      }
      const chart = await castChart(birth)
      await Taro.setStorageSync("zm-mp-last-chart", chart)
      await Taro.reLaunch({ url: "/pages/chart-result/index" })
    } catch (e) {
      setErr(e instanceof Error ? e.message : String(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <View className="min-h-screen bg-paper px-6 py-8">
      <Text className="block text-2xl font-serif text-ink mb-6">{t("chart.title")}</Text>

      <Field label={t("chart.input.calendar")}>
        <Picker
          mode="selector"
          range={["公历", "农历"]}
          value={calendar === "solar" ? 0 : 1}
          onChange={(e) => setCalendar(e.detail.value === 0 ? "solar" : "lunar")}
        >
          <View className="px-3 py-2 bg-card border border-rule rounded">
            <Text className="text-ink">{calendar === "solar" ? "公历" : "农历"}</Text>
          </View>
        </Picker>
      </Field>

      {calendar === "lunar" && (
        <Field label="闰月">
          <Picker
            mode="selector"
            range={["否", "是"]}
            value={isLeapMonth ? 1 : 0}
            onChange={(e) => setIsLeapMonth(e.detail.value === 1)}
          >
            <View className="px-3 py-2 bg-card border border-rule rounded">
              <Text className="text-ink">{isLeapMonth ? "闰月" : "非闰月"}</Text>
            </View>
          </Picker>
        </Field>
      )}

      <Field label={t("chart.input.birthTime")}>
        <View className="flex gap-2">
          <NumberBox value={year} min={1900} max={2100} onChange={setYear} />
          <NumberBox value={month} min={1} max={12} onChange={setMonth} />
          <NumberBox value={day} min={1} max={31} onChange={setDay} />
        </View>
        <Picker
          mode="selector"
          range={HOURS}
          value={hour}
          onChange={(e) => setHour(Number(e.detail.value))}
        >
          <View className="mt-2 px-3 py-2 bg-card border border-rule rounded">
            <Text className="text-ink">时：{HOURS[hour]}</Text>
          </View>
        </Picker>
      </Field>

      <Field label={t("chart.input.gender")}>
        <View className="flex gap-2">
          <View
            className={`flex-1 py-2 text-center rounded border ${gender === 0 ? "bg-accent text-white border-accent" : "bg-card text-ink border-rule"}`}
            onClick={() => setGender(0)}
          >
            <Text>{t("chart.input.male")}</Text>
          </View>
          <View
            className={`flex-1 py-2 text-center rounded border ${gender === 1 ? "bg-accent text-white border-accent" : "bg-card text-ink border-rule"}`}
            onClick={() => setGender(1)}
          >
            <Text>{t("chart.input.female")}</Text>
          </View>
        </View>
      </Field>

      <Field label={t("chart.input.birthPlace")}>
        <Picker
          mode="selector"
          range={provinces.map((p) => p.name)}
          value={pIdx}
          onChange={(e) => setPIdx(Number(e.detail.value))}
        >
          <View className="px-3 py-2 bg-card border border-rule rounded">
            <Text className="text-ink">{provinces[pIdx]?.name ?? "加载中…"}</Text>
          </View>
        </Picker>
        {cities.length > 0 && (
          <Picker
            mode="selector"
            range={cities.map((c) => c.name)}
            value={cIdx}
            onChange={(e) => setCIIdx(Number(e.detail.value))}
          >
            <View className="mt-2 px-3 py-2 bg-card border border-rule rounded">
              <Text className="text-ink">{cities[cIdx]?.name ?? "选择城市"}</Text>
            </View>
          </Picker>
        )}
        {counties.length > 0 && (
          <Picker
            mode="selector"
            range={counties.map((k) => k.name)}
            value={kIdx}
            onChange={(e) => setKIdx(Number(e.detail.value))}
          >
            <View className="mt-2 px-3 py-2 bg-card border border-rule rounded">
              <Text className="text-ink">{counties[kIdx]?.name ?? "选择区县"}</Text>
            </View>
          </Picker>
        )}
      </Field>

      {err && <Text className="block mb-4 text-sm text-accent">{err}</Text>}

      <Button
        className="w-full mt-6 py-4 bg-accent text-white rounded-lg text-base"
        loading={busy}
        disabled={busy}
        onClick={submit}
      >
        {busy ? t("chart.input.submitting") : t("chart.input.submit")}
      </Button>
    </View>
  )
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View className="mb-4">
      <Text className="block text-sm text-muted mb-2">{label}</Text>
      {children}
    </View>
  )
}

function NumberBox({
  value,
  min,
  max,
  onChange,
}: { value: number; min: number; max: number; onChange: (n: number) => void }) {
  return (
    <Input
      type="number"
      value={String(value)}
      onInput={(e) => {
        const n = Number((e.detail as { value: string }).value)
        if (!Number.isNaN(n) && n >= min && n <= max) onChange(n)
      }}
      className="w-20 px-3 py-2 bg-card border border-rule rounded text-center"
    />
  )
}
