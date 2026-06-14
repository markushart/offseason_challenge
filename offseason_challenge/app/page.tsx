import { AuthShell } from "@/components/auth-shell";

const teams = [
  { name: "Team Blau", points: 386, members: 12, color: "bg-blue-600" },
  { name: "Team Kupfer", points: 342, members: 11, color: "bg-amber-600" },
  { name: "Team Wald", points: 318, members: 12, color: "bg-emerald-600" },
];

const activities = [
  { name: "Team training", detail: "Normal unit", points: 10, tag: "Official" },
  { name: "Running", detail: "40 minutes", points: 4, tag: "Cardio" },
  { name: "Gym", detail: "Complete unit", points: 4, tag: "Strength" },
  { name: "Recovery", detail: "Mobility", points: 1, tag: "Light" },
];

const feed = [
  { user: "Mila", activity: "Team training", team: "Team Blau", points: 10 },
  { user: "Jonas", activity: "Running, 50 min", team: "Team Kupfer", points: 5 },
  { user: "Lea", activity: "Athletic unit", team: "Team Wald", points: 5 },
  { user: "Nico", activity: "Recovery walk", team: "Team Blau", points: 1 },
];

const rules = [
  "15 point weekly cap on extra activities",
  "Thursday without athletic training scores 8",
  "Proof optional in auto-accept mode",
];

export default function Home() {
  return (
    <AuthShell>
      <main className="min-h-screen bg-stone-50 text-zinc-950">
        <section className="mx-auto flex w-full max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
          <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.12em] text-emerald-700">
                Offseason Challenge
              </p>
              <h1 className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950 sm:text-4xl">
                Handball preseason team competition
              </h1>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center sm:min-w-[420px]">
              <Metric label="Week" value="3" />
              <Metric label="Logs" value="148" />
              <Metric label="Teams" value="3" />
            </div>
          </header>

          <section className="grid gap-5 lg:grid-cols-[1.25fr_0.75fr]">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <h2 className="text-xl font-semibold">Live standings</h2>
                  <p className="mt-1 text-sm text-zinc-600">
                    Accepted team points for Handball Offseason 2026
                  </p>
                </div>
                <span className="w-fit rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-800">
                  Active
                </span>
              </div>

              <div className="mt-6 space-y-4">
                {teams.map((team, index) => (
                  <div key={team.name} className="grid gap-2">
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <span className="flex h-8 w-8 items-center justify-center rounded-md bg-zinc-100 text-sm font-semibold">
                          {index + 1}
                        </span>
                        <div>
                          <p className="font-semibold">{team.name}</p>
                          <p className="text-sm text-zinc-500">
                            {team.members} members
                          </p>
                        </div>
                      </div>
                      <p className="text-lg font-semibold">{team.points}</p>
                    </div>
                    <div className="h-3 overflow-hidden rounded-full bg-zinc-100">
                      <div>
                        <div
                          className={`h-3 ${team.color}`}
                          style={{
                            width: `${(team.points / teams[0].points) * 100}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Quick log</h2>
              <form className="mt-5 grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Activity
                  <select className="h-11 rounded-md border border-zinc-300 bg-white px-3 text-zinc-950">
                    <option>Running / Jogging</option>
                    <option>Team training</option>
                    <option>Gym / Athletic training</option>
                    <option>Recovery / Light activity</option>
                  </select>
                </label>
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Duration
                  <input
                    className="h-11 rounded-md border border-zinc-300 px-3 text-zinc-950"
                    defaultValue="40 minutes"
                  />
                </label>
                <label className="grid gap-2 text-sm font-medium text-zinc-700">
                  Proof
                  <div className="flex h-11 items-center justify-between rounded-md border border-dashed border-zinc-300 px-3 text-sm text-zinc-500">
                    fitness-screenshot.png
                    <span className="font-semibold text-emerald-700">Ready</span>
                  </div>
                </label>
                <div className="rounded-md bg-zinc-950 p-4 text-white">
                  <p className="text-sm text-zinc-300">Calculated score</p>
                  <div className="mt-2 flex items-end justify-between">
                    <p className="text-4xl font-semibold">4 pts</p>
                    <p className="text-sm text-zinc-300">Auto-accepted</p>
                  </div>
                </div>
                <button className="h-11 rounded-md bg-emerald-700 px-4 font-semibold text-white shadow-sm transition hover:bg-emerald-800">
                  Submit activity
                </button>
              </form>
            </div>
          </section>

          <section className="grid gap-5 lg:grid-cols-3">
            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm lg:col-span-2">
              <h2 className="text-xl font-semibold">Activity catalog</h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {activities.map((activity) => (
                  <article
                    key={activity.name}
                    className="rounded-md border border-zinc-200 p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h3 className="font-semibold">{activity.name}</h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          {activity.detail}
                        </p>
                      </div>
                      <span className="rounded-md bg-zinc-100 px-2 py-1 text-xs font-semibold text-zinc-700">
                        {activity.tag}
                      </span>
                    </div>
                    <p className="mt-5 text-2xl font-semibold">
                      {activity.points} pts
                    </p>
                  </article>
                ))}
              </div>
            </div>

            <div className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
              <h2 className="text-xl font-semibold">Rule snapshot</h2>
              <ul className="mt-4 space-y-3">
                {rules.map((rule) => (
                  <li key={rule} className="flex gap-3 text-sm text-zinc-700">
                    <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-emerald-600" />
                    {rule}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          <section className="rounded-lg border border-zinc-200 bg-white p-4 shadow-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-xl font-semibold">Recent submissions</h2>
              <div className="flex gap-2">
                <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium">
                  Week 3
                </button>
                <button className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-medium">
                  Accepted
                </button>
              </div>
            </div>
            <div className="mt-4 overflow-x-auto">
              <table className="w-full min-w-[620px] border-collapse text-left text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 text-zinc-500">
                    <th className="py-3 font-medium">Participant</th>
                    <th className="py-3 font-medium">Activity</th>
                    <th className="py-3 font-medium">Team</th>
                    <th className="py-3 text-right font-medium">Points</th>
                  </tr>
                </thead>
                <tbody>
                  {feed.map((item) => (
                    <tr
                      key={`${item.user}-${item.activity}`}
                      className="border-b border-zinc-100"
                    >
                      <td className="py-3 font-medium">{item.user}</td>
                      <td className="py-3 text-zinc-600">{item.activity}</td>
                      <td className="py-3 text-zinc-600">{item.team}</td>
                      <td className="py-3 text-right font-semibold">
                        {item.points}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        </section>
      </main>
    </AuthShell>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-white p-3 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
        {label}
      </p>
      <p className="mt-1 text-2xl font-semibold">{value}</p>
    </div>
  );
}
