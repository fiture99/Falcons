import { type FormEvent, type ReactNode, useMemo, useState } from 'react';
import { QueryClient, QueryClientProvider, useQueryClient } from '@tanstack/react-query';
import { Route, Switch, Link, useLocation, Router as WouterRouter } from 'wouter';
import {
  Activity, BadgeCheck, Banknote, CalendarDays, Check,
  CheckCircle2, ChevronDown, Clock3, Dumbbell, FilePlus2, HeartPulse, LayoutDashboard,
  LogOut, Menu, MoreHorizontal, Plus, Search, ShieldAlert, UserRound, Users, Wallet,
  X, XCircle, QrCode, ArrowRight, CalendarCheck, ClipboardList, RefreshCw, CircleHelp,
  Copy, Download,
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import {
  useGetGymDashboard, getGetGymDashboardQueryKey, useGetGymActivity, getGetGymActivityQueryKey,
  useListGymMembers, getListGymMembersQueryKey, useCreateGymMember, useUpdateGymMember,
  useDeleteGymMember, useListGymApprovals, getListGymApprovalsQueryKey, useDecideGymMemberApproval,
  useListGymSessions, getListGymSessionsQueryKey, useCreateGymSession, useUpdateGymSession,
  useDeleteGymSession, useChangeGymBooking, useListGymCheckins, getListGymCheckinsQueryKey,
  useCreateGymCheckin, useListGymTrainingLogs, getListGymTrainingLogsQueryKey,
  useCreateGymTrainingLog, useListGymPayments, getListGymPaymentsQueryKey, useCreateGymPayment,
  useRegisterGymMember,
} from '@workspace/api-client-react';
import type { GymMember, GymSession, GymActivity } from '@workspace/api-client-react';

const queryClient = new QueryClient();
type Role = 'Front desk' | 'Administrator' | 'Coach' | 'Physiotherapist';
const navItems = [
  { href: '/', label: 'Overview', icon: LayoutDashboard, roles: ['Front desk','Administrator','Coach','Physiotherapist'] },
  { href: '/members', label: 'Members', icon: Users, roles: ['Front desk','Administrator','Coach','Physiotherapist'] },
  { href: '/approvals', label: 'Approvals', icon: BadgeCheck, roles: ['Administrator','Front desk'] },
  { href: '/sign-up-qr', label: 'Sign-up QR', icon: QrCode, roles: ['Administrator','Front desk'] },
  { href: '/sessions', label: 'Sessions', icon: CalendarDays, roles: ['Administrator','Coach','Front desk'] },
  { href: '/training', label: 'Training log', icon: Dumbbell, roles: ['Coach','Physiotherapist','Administrator'] },
  { href: '/payments', label: 'Payments', icon: Wallet, roles: ['Administrator','Front desk'] },
];
const MEMBER_TYPES = ['Player', 'Academy', 'Staff', 'Public'];
const PLANS_BY_TYPE: Record<string, string[]> = {
  Player: ['Squad'],
  Academy: ['Academy'],
  Staff: ['Staff'],
  Public: ['Monthly D1,500', 'Quarterly D4,000'],
};
const PLAN_DURATIONS: Record<string, number> = {
  Squad: 365,
  Academy: 365,
  Staff: 365,
  'Monthly D1,500': 30,
  'Quarterly D4,000': 90,
  Monthly: 30,
  Annual: 365,
  'Off-peak': 30,
  Student: 30,
  Junior: 30,
  Family: 30,
};
const money = (value: number) => `D${value.toLocaleString('en-GB')}`;
const dateTime = (value: string) => new Date(value).toLocaleString('en-GB', { day:'numeric', month:'short', hour:'2-digit', minute:'2-digit' });
const dateOnly = (value: string) => new Date(value).toLocaleDateString('en-GB', { day:'numeric', month:'short', year:'numeric' });
const cx = (...values: (string | false | undefined)[]) => values.filter(Boolean).join(' ');
const clubCrestUrl = `${import.meta.env.BASE_URL}falcons-crest.png`;

function App() {
  return <QueryClientProvider client={queryClient}>
    <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <Switch>
        <Route path="/join" component={JoinPage} />
        <Route><Shell /></Route>
      </Switch>
    </WouterRouter>
  </QueryClientProvider>;
}

function Shell() {
  const [location] = useLocation();
  const [role, setRole] = useState<Role>('Front desk');
  const [mobileNav, setMobileNav] = useState(false);
  const page = navItems.find((item) => item.href === location);
  const links = navItems.filter((item) => item.roles.includes(role));
  return <div className="app-grain min-h-[100dvh] bg-background">
    <aside className={cx('fixed inset-y-0 left-0 z-50 flex w-[256px] flex-col bg-sidebar text-sidebar-foreground transition-transform duration-200 lg:translate-x-0', mobileNav ? 'translate-x-0' : '-translate-x-full')}>
      <div className="flex h-[86px] items-center gap-3 border-b border-white/10 px-6">
        <img src={clubCrestUrl} alt="Falcons FC crest" className="h-10 w-10 rounded-xl bg-white object-contain p-0.5"/>
        <div><div className="font-[var(--app-font-mono)] text-sm font-bold tracking-tight">FALCONS FC</div><div className="mt-0.5 text-[10px] uppercase tracking-[.22em] text-white/48">Club operations</div></div>
      </div>
      <div className="px-4 pt-7">
        <div className="mb-3 px-3 text-[10px] font-bold uppercase tracking-[.2em] text-white/40">Workspace</div>
        <nav className="space-y-1">{links.map(({ href, label, icon: Icon }) => <Link key={href} href={href} onClick={() => setMobileNav(false)} data-testid={`nav-${label.toLowerCase().replaceAll(' ','-')}`} className={cx('flex items-center gap-3 rounded-xl px-3 py-3 text-[13px] font-medium transition-colors', location === href ? 'bg-white/10 text-[#b9c9ff]' : 'text-white/70 hover:bg-white/[.06] hover:text-white')}><Icon size={17} strokeWidth={1.8}/><span>{label}</span>{label === 'Approvals' && <ApprovalCount/>}</Link>)}</nav>
      </div>
      <div className="mt-auto p-4">
        <div className="rounded-2xl border border-white/10 bg-white/[.045] p-4">
          <div className="flex items-center gap-2 text-xs font-semibold"><CircleHelp size={15} className="text-[#b9c9ff]"/> Help desk</div>
          <p className="mb-3 mt-2 text-[11px] leading-relaxed text-white/52">Need a hand with today's club operations?</p>
          <button onClick={() => window.location.href = 'mailto:clubops@example.org'} className="text-[11px] font-semibold text-[#b9c9ff] hover:text-white" data-testid="button-contact-support">Contact support <ArrowRight size={12} className="ml-1 inline"/></button>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-white/10 px-2 pt-4">
          <div className="grid h-9 w-9 place-items-center rounded-full bg-white/10 text-xs font-bold text-[#b9c9ff]">{role === 'Physiotherapist' ? 'PT' : role === 'Administrator' ? 'AD' : role === 'Coach' ? 'CO' : 'FD'}</div>
          <div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">Club staff</div><div className="text-[10px] text-white/48">{role}</div></div>
          <LogOut size={15} className="text-white/35"/>
        </div>
      </div>
    </aside>
    {mobileNav && <button aria-label="Close navigation" onClick={() => setMobileNav(false)} className="fixed inset-0 z-40 bg-black/30 lg:hidden" data-testid="button-close-navigation"/>}
    <div className="min-h-[100dvh] lg:pl-[256px]">
      <header className="sticky top-0 z-30 flex h-[70px] items-center justify-between border-b border-border bg-background/95 px-4 backdrop-blur sm:px-8">
        <div className="flex items-center gap-3">
          <button onClick={() => setMobileNav(!mobileNav)} className="rounded-lg p-2 hover:bg-muted lg:hidden" aria-label="Open navigation" data-testid="button-open-navigation"><Menu size={19}/></button>
          <div className="hidden text-[11px] font-medium text-muted-foreground sm:block">FALCONS FC <span className="mx-2 text-border">/</span></div>
          <div className="text-sm font-semibold">{page?.label ?? (location === '/' ? 'Overview' : 'Club operations')}</div>
        </div>
        <div className="flex items-center gap-3">
          <div className="hidden items-center gap-2 text-[11px] text-muted-foreground sm:flex"><span className="h-2 w-2 rounded-full bg-primary"/> Club open <span className="mx-1 text-border">·</span>{new Date().toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})}</div>
          <Link href="/join" className="hidden items-center gap-1 rounded-lg px-2 py-2 text-[10px] font-semibold text-primary hover:bg-primary/5 sm:inline-flex" data-testid="link-public-registration">Public sign-up <ArrowRight size={12}/></Link>
          <label className="relative flex items-center">
            <span className="sr-only">Select staff view</span>
            <UserRound size={14} className="absolute left-2.5 text-muted-foreground"/>
            <select aria-label="Staff view" data-testid="select-staff-role" value={role} onChange={(event) => setRole(event.target.value as Role)} className="h-9 appearance-none rounded-lg border border-border bg-card py-1 pl-8 pr-8 text-[11px] font-semibold outline-none focus:ring-2 focus:ring-primary/20">{['Front desk','Administrator','Coach','Physiotherapist'].map((v) => <option key={v}>{v}</option>)}</select>
            <ChevronDown size={12} className="pointer-events-none absolute right-2.5 text-muted-foreground"/>
          </label>
        </div>
      </header>
      <main className="mx-auto max-w-[1500px] px-4 pb-12 pt-7 sm:px-8 lg:px-10 page-in">
        <Switch>
          <Route path="/" component={DashboardPage}/>
          <Route path="/members" component={MembersPage}/>
          <Route path="/approvals" component={ApprovalsPage}/>
          <Route path="/sessions" component={SessionsPage}/>
          <Route path="/training" component={TrainingPage}/>
          <Route path="/payments" component={PaymentsPage}/>
          <Route path="/sign-up-qr" component={SignUpQrPage}/>
          <Route><NotFound/></Route>
        </Switch>
      </main>
    </div>
  </div>;
}

function ApprovalCount() {
  const { data } = useListGymApprovals();
  return data?.length ? <span className="ml-auto rounded-md bg-[#dfb958] px-1.5 py-0.5 text-[10px] font-bold text-[#20382c]" data-testid="count-pending-approvals">{data.length}</span> : null;
}
function Heading({ eyebrow, title, subtitle, action }: { eyebrow:string; title:string; subtitle:string; action?:ReactNode }) {
  return <div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><div className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary">{eyebrow}</div><h1 className="font-[var(--app-font-mono)] text-[28px] font-semibold leading-tight tracking-[-.045em] sm:text-[34px]" data-testid="text-page-title">{title}</h1><p className="mt-2 max-w-2xl text-[13px] text-muted-foreground">{subtitle}</p></div>{action}</div>;
}
function Btn({ children, onClick, variant='primary', type='button', disabled=false, testId }: {children:ReactNode; onClick?:()=>void; variant?:'primary'|'outline'|'quiet'|'danger'; type?:'button'|'submit'; disabled?:boolean; testId:string}) {
  return <button type={type} onClick={onClick} disabled={disabled} data-testid={testId} className={cx('inline-flex h-10 items-center justify-center gap-2 rounded-lg px-4 text-xs font-semibold transition-all disabled:cursor-not-allowed disabled:opacity-50', variant==='primary'?'bg-primary text-primary-foreground hover:brightness-110':variant==='danger'?'bg-destructive text-destructive-foreground hover:brightness-110':variant==='outline'?'border border-border bg-card text-foreground hover:bg-muted':'text-muted-foreground hover:bg-muted hover:text-foreground')}>{children}</button>;
}
function Panel({ children, className='', title, action }: {children:ReactNode; className?:string; title?:string; action?:ReactNode}) {
  return <section className={cx('rounded-2xl border border-card-border bg-card shadow-[var(--shadow-sm)]',className)}>{title && <div className="flex items-center justify-between border-b border-border px-5 py-4"><h2 className="text-[13px] font-semibold">{title}</h2>{action}</div>}{children}</section>;
}
function LoadingRows({ count=4 }: {count?:number}) { return <div className="space-y-3 p-5" aria-label="Loading"><div className="h-3 w-28 animate-pulse rounded bg-muted"/>{Array.from({length:count},(_,i)=><div key={i} className="h-12 animate-pulse rounded-xl bg-muted/70"/>)}</div>; }
function QueryState({ loading,error,retry,children }: {loading:boolean;error:boolean;retry:()=>void;children:ReactNode}) {
  if(loading)return <LoadingRows/>;
  if(error)return <div className="flex flex-col items-center px-6 py-12 text-center" data-testid="state-error"><div className="grid h-11 w-11 place-items-center rounded-full bg-destructive/10 text-destructive"><RefreshCw size={18}/></div><p className="mt-3 text-sm font-semibold">We couldn't load this view</p><p className="mt-1 text-xs text-muted-foreground">Check your connection and try again.</p><Btn onClick={retry} variant="outline" testId="button-retry" >Try again</Btn></div>;
  return <>{children}</>;
}
function Empty({ title, detail }: {title:string;detail:string}) { return <div className="flex flex-col items-center px-6 py-12 text-center" data-testid="state-empty"><div className="grid h-12 w-12 place-items-center rounded-2xl bg-secondary text-primary"><ClipboardList size={21}/></div><p className="mt-3 text-sm font-semibold">{title}</p><p className="mt-1 max-w-xs text-xs leading-relaxed text-muted-foreground">{detail}</p></div>; }
function Modal({ title, children, close }: {title:string;children:ReactNode;close:()=>void}) {
  return <div className="fixed inset-0 z-[70] flex items-end justify-center bg-[#101b42]/45 p-0 backdrop-blur-[2px] sm:items-center sm:p-5" onMouseDown={(e)=>{if(e.target===e.currentTarget)close();}}><div role="dialog" aria-modal="true" className="max-h-[92dvh] w-full max-w-[560px] overflow-y-auto rounded-t-2xl border border-border bg-card p-5 shadow-2xl sm:rounded-2xl sm:p-7"><div className="mb-5 flex items-start justify-between"><div><div className="mb-1 text-[10px] font-bold uppercase tracking-[.19em] text-primary">Falcons FC · club ops</div><h2 className="font-[var(--app-font-mono)] text-xl font-semibold tracking-tight">{title}</h2></div><button onClick={close} className="rounded-lg p-2 text-muted-foreground hover:bg-muted" aria-label="Close dialog" data-testid="button-close-dialog"><X size={17}/></button></div>{children}</div></div>;
}
function Field({ label, children, testId }: {label:string;children:ReactNode;testId?:string}) { return <label className="block"><span className="mb-1.5 block text-[11px] font-semibold text-foreground/80">{label}</span>{children}</label>; }
const inputClass='h-10 w-full rounded-lg border border-input bg-background px-3 text-[13px] outline-none placeholder:text-muted-foreground/70 focus:border-primary/60 focus:ring-2 focus:ring-primary/10';
function SelectField({label,value,onChange,options,testId}: {label:string;value:string;onChange:(v:string)=>void;options:string[];testId:string}) {
  return <Field label={label}><select value={value} onChange={e=>onChange(e.target.value)} data-testid={testId} className={inputClass}>{options.map(x=><option key={x}>{x}</option>)}</select></Field>;
}
function ErrorNote({ error }: {error:boolean}) { return error?<div className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive" role="alert">That change could not be saved. Please retry.</div>:null; }
function StatusPill({status}: {status:string}) {
  const tone=status.toLowerCase().includes('active')||status.toLowerCase().includes('approved')?'bg-[#e8f1e9] text-[#2e6747]':status.toLowerCase().includes('hold')||status.toLowerCase().includes('medical')?'bg-[#f8ebdc] text-[#98652e]':status.toLowerCase().includes('pending')?'bg-[#f7efda] text-[#92732b]':'bg-muted text-muted-foreground';
  return <span className={cx('inline-flex rounded-full px-2.5 py-1 text-[10px] font-bold capitalize',tone)} data-testid={`status-${status.toLowerCase().replaceAll(' ','-')}`}>{status}</span>;
}

function DashboardPage() {
  const qc=useQueryClient(); const dash=useGetGymDashboard(); const activity=useGetGymActivity(); const checkins=useListGymCheckins(); const members=useListGymMembers();
  const createCheckin=useCreateGymCheckin(); const [checkinInput,setCheckinInput]=useState(''); const [checkinMessage,setCheckinMessage]=useState('');
  const selectedMember=members.data?.find(m=>`${m.name} ${m.id}`.toLowerCase().includes(checkinInput.toLowerCase()));
  const refresh=()=>{void qc.invalidateQueries({queryKey:getGetGymDashboardQueryKey()});};
  const runCheckin=(e:FormEvent)=>{e.preventDefault(); if(!selectedMember)return; createCheckin.mutate({data:{memberId:selectedMember.id}},{onSuccess:r=>{setCheckinMessage(r.message);setCheckinInput('');void qc.invalidateQueries({queryKey:getListGymCheckinsQueryKey()});refresh();void qc.invalidateQueries({queryKey:getGetGymActivityQueryKey()});}});};
  const d=dash.data;
  const metricItems=d?[{label:'Checked in today',value:d.checkedInToday,sub:'club visits today',icon:QrCode,tone:'primary'},{label:'Active members',value:d.activeMembers,sub:'current memberships',icon:Users,tone:'sand'},{label:'Expiring soon',value:d.expiringSoon,sub:'within 14 days',icon:Clock3,tone:'rose'},{label:'Medical hold',value:d.medicalHold,sub:'needs a follow-up',icon:HeartPulse,tone:'blue'}]:[];
  return <>
    <Heading eyebrow="Club pulse · Today" title="Good morning, team." subtitle="A clear view of the club floor, member care, and what needs attention." action={<div className="flex items-center gap-2 self-start rounded-lg border border-border bg-card px-3 py-2 text-[11px] text-muted-foreground sm:self-auto"><span className="h-2 w-2 rounded-full bg-primary"/> Live operations</div>}/>
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{dash.isLoading?Array.from({length:4},(_,i)=><div key={i} className="h-[124px] animate-pulse rounded-2xl bg-muted"/>):dash.isError?<Panel className="col-span-full"><QueryState loading={false} error retry={refresh}><></></QueryState></Panel>:metricItems.map(({label,value,sub,icon:Icon,tone},i)=><div key={label} data-testid={`metric-${label.toLowerCase().replaceAll(' ','-')}`} className="page-in relative overflow-hidden rounded-2xl border border-card-border bg-card p-5 shadow-[var(--shadow-sm)]" style={{animationDelay:`${i*50}ms`}}><div className="flex items-start justify-between"><div className={cx('grid h-9 w-9 place-items-center rounded-xl',tone==='primary'?'bg-primary/10 text-primary':tone==='sand'?'bg-[#f6efd9] text-[#8e7130]':tone==='rose'?'bg-[#f7e8e1] text-[#a55f47]':'bg-[#e5eef0] text-[#47727b]')}><Icon size={17}/></div><span className="text-[10px] text-muted-foreground">Today</span></div><div className="mt-4 flex items-end justify-between"><div><div className="font-[var(--app-font-mono)] text-[28px] font-semibold tracking-[-.05em]">{label==='Revenue this month'?money(Number(value)):value.toLocaleString()}</div><div className="mt-0.5 text-[11px] text-muted-foreground">{label}</div></div><div className="pb-1 text-right text-[10px] text-muted-foreground">{sub}</div></div></div>)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.45fr_.85fr]">
      <Panel className="overflow-hidden">
        <div className="flex items-center justify-between border-b border-border px-5 py-4"><div><h2 className="text-[13px] font-semibold">Front desk check-in</h2><p className="mt-1 text-[11px] text-muted-foreground">Look up a member by name or membership number</p></div><div className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary"><QrCode size={17}/></div></div>
        <form onSubmit={runCheckin} className="p-5">
          <div className="relative"><Search size={16} className="absolute left-3.5 top-3 text-muted-foreground"/><input autoComplete="off" value={checkinInput} onChange={e=>{setCheckinInput(e.target.value);setCheckinMessage('');}} placeholder="Search member name or ID…" className={`${inputClass} h-11 pl-10`} data-testid="input-checkin-member"/>{checkinInput&&members.data?.length?<div className="absolute top-[calc(100%+5px)] z-20 max-h-56 w-full overflow-y-auto rounded-xl border border-border bg-card p-1 shadow-lg">{members.data.filter(m=>`${m.name} ${m.id}`.toLowerCase().includes(checkinInput.toLowerCase())).slice(0,6).map(m=><button key={m.id} type="button" onClick={()=>setCheckinInput(m.name)} className="flex w-full items-center justify-between rounded-lg px-3 py-2.5 text-left hover:bg-muted" data-testid={`option-checkin-member-${m.id}`}><span className="text-xs font-semibold">{m.name}</span><span className="text-[10px] text-muted-foreground">#{m.id} · {m.status}</span></button>)}</div>:null}</div>
          <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center"><div className="min-h-5 flex-1 text-xs">{checkinMessage&&<span className="text-primary" data-testid="text-checkin-result">{checkinMessage}</span>}{selectedMember&&<span className="text-muted-foreground" data-testid="text-selected-member">Ready to check in <strong className="text-foreground">{selectedMember.name}</strong> · {selectedMember.plan}</span>}</div><Btn type="submit" disabled={!selectedMember||createCheckin.isPending} testId="button-check-in">{createCheckin.isPending?'Checking in…':<><Check size={15}/> Check in member</>}</Btn></div>
          <ErrorNote error={createCheckin.isError}/>
        </form>
        <div className="border-t border-border bg-background/40 px-5 py-4"><div className="mb-3 flex items-center justify-between"><div className="text-[11px] font-semibold">Latest arrivals</div><span className="text-[10px] text-muted-foreground">Today</span></div>
          {checkins.isLoading?<div className="h-10 animate-pulse rounded-lg bg-muted"/>:checkins.isError?<div className="text-xs text-destructive" data-testid="state-checkins-error">Check-ins are unavailable right now.</div>:checkins.data?.length?<div className="space-y-2">{checkins.data.slice(0,3).map(row=><div key={row.id} className="flex items-center gap-3 rounded-lg bg-card px-3 py-2" data-testid={`row-checkin-${row.id}`}><div className="grid h-8 w-8 place-items-center rounded-full bg-secondary text-[10px] font-bold text-primary">{row.memberName.split(' ').map(w=>w[0]).slice(0,2).join('')}</div><div className="min-w-0 flex-1"><div className="truncate text-xs font-semibold">{row.memberName}</div><div className="text-[10px] text-muted-foreground">{dateTime(row.checkedInAt)}</div></div><StatusPill status={row.allowed?'Allowed':'Review'}/></div>)}</div>:<p className="text-xs text-muted-foreground">No check-ins recorded yet today.</p>}
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel title="Needs your attention" action={<Link href="/approvals" className="text-[10px] font-semibold text-primary hover:underline" data-testid="link-view-approvals">View queue <ArrowRight size={12} className="ml-1 inline"/></Link>}>
          <div className="space-y-1 p-3">
            <Attention icon={BadgeCheck} label="Registrations waiting" value={d?.awaitingApproval} href="/approvals" tone="gold"/>
            <Attention icon={ShieldAlert} label="Medical follow-ups" value={d?.medicalHold} href="/members" tone="rose"/>
            <Attention icon={Clock3} label="Memberships expiring" value={d?.expiringSoon} href="/members" tone="blue"/>
          </div>
        </Panel>
        <Panel title="Club activity" action={<span className="text-[10px] text-muted-foreground">Latest first</span>}>
          <QueryState loading={activity.isLoading} error={activity.isError} retry={()=>void qc.invalidateQueries({queryKey:getGetGymActivityQueryKey()})}>
            {activity.data?.length?<div className="divide-y divide-border">{activity.data.slice(0,5).map(item=><ActivityRow item={item} key={item.id}/>)}</div>:<Empty title="The club is quiet so far" detail="Member check-ins, bookings, and payments will appear here as they happen."/>}
          </QueryState>
        </Panel>
      </div>
    </div>
    <div className="mt-5 grid gap-5 lg:grid-cols-[1.35fr_.65fr]">
      <AttendanceChart/>
      <Panel className="overflow-hidden bg-[#172653] text-white">
        <div className="p-5"><div className="flex items-center justify-between"><div className="text-[10px] font-bold uppercase tracking-[.18em] text-[#b9c9ff]">This month</div><Banknote size={18} className="text-[#b9c9ff]"/></div><div className="mt-8 font-[var(--app-font-mono)] text-3xl font-semibold tracking-[-.05em]" data-testid="metric-revenue-this-month">{dash.data?money(dash.data.revenueThisMonth):'—'}</div><div className="mt-1 text-xs text-white/60">Recorded revenue</div><div className="mt-7 border-t border-white/15 pt-4"><Link href="/payments" className="inline-flex items-center gap-2 text-xs font-semibold text-[#b9c9ff] hover:text-white" data-testid="link-open-payments">Open payment records <ArrowRight size={14}/></Link></div></div>
      </Panel>
    </div>
  </>;
}
function Attention({icon:Icon,label,value,href,tone}: {icon:typeof BadgeCheck;label:string;value?:number;href:string;tone:string}) { return <Link href={href} data-testid={`attention-${label.toLowerCase().replaceAll(' ','-')}`} className="flex items-center gap-3 rounded-xl px-2.5 py-2.5 hover:bg-muted/70"><div className={cx('grid h-8 w-8 place-items-center rounded-lg',tone==='gold'?'bg-[#f7efd9] text-[#977b37]':tone==='rose'?'bg-[#f7e9e3] text-[#a26048]':'bg-[#e6eff0] text-[#4c747c]')}><Icon size={15}/></div><span className="flex-1 text-xs font-medium">{label}</span><span className="font-[var(--app-font-mono)] text-sm font-semibold">{value??'—'}</span><ArrowRight size={13} className="text-muted-foreground"/></Link>; }
function ActivityRow({item}: {item:GymActivity}) { return <div className="flex gap-3 px-4 py-3" data-testid={`activity-${item.id}`}><div className="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-secondary text-primary"><Activity size={13}/></div><div className="min-w-0 flex-1"><div className="text-[11px] font-semibold">{item.label}</div><div className="mt-0.5 truncate text-[10px] text-muted-foreground">{item.detail}</div></div><time className="shrink-0 pt-0.5 text-[9px] text-muted-foreground">{dateTime(item.occurredAt)}</time></div>; }
function AttendanceChart() {
  const qc=useQueryClient(); const {data,isLoading,isError}=useGetGymDashboard();
  return <Panel title="Attendance rhythm" action={<div className="flex items-center gap-1.5 text-[10px] text-muted-foreground"><span className="h-2 w-2 rounded-sm bg-primary"/> Visits</div>}>
    <QueryState loading={isLoading} error={isError} retry={()=>void qc.invalidateQueries({queryKey:getGetGymDashboardQueryKey()})}>
    {data?.attendance?.length?<div className="px-5 pb-4 pt-5"><div className="flex h-[150px] items-end gap-2 sm:gap-4">{data.attendance.map((d,i)=>{const max=Math.max(...data.attendance.map(x=>x.count),1);return <div key={`${d.day}-${i}`} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-2" data-testid={`bar-attendance-${i}`}><span className="text-[9px] text-muted-foreground">{d.count}</span><div className="w-full max-w-[42px] rounded-t-md bg-primary/85 transition-all" style={{height:`${Math.max(4,d.count/max*100)}%`}}/><span className="truncate text-[9px] text-muted-foreground">{d.day}</span></div>})}</div></div>:<Empty title="Attendance will take shape here" detail="Daily club visits are summarized once the first check-ins are recorded."/>}
    </QueryState>
  </Panel>;
}

function MembersPage() {
  const qc=useQueryClient(); const [search,setSearch]=useState('');const [status,setStatus]=useState('All statuses');const [type,setType]=useState('All types');const [editing,setEditing]=useState<GymMember|null|false>(false);const [confirmDelete,setConfirmDelete]=useState<GymMember|null>(null);
  const params=useMemo(()=>({search:search||undefined,status:status==='All statuses'?undefined:status,type:type==='All types'?undefined:type}),[search,status,type]);
  const query=useListGymMembers(params);const del=useDeleteGymMember();
  const invalidate=()=>{void qc.invalidateQueries({queryKey:getListGymMembersQueryKey()});void qc.invalidateQueries({queryKey:getGetGymDashboardQueryKey()});void qc.invalidateQueries({queryKey:getGetGymActivityQueryKey()});};
  return <>
    <Heading eyebrow="People · Membership" title="Members" subtitle="The people who make this club. Find a record, check status, or make an update." action={<Btn onClick={()=>setEditing(null)} testId="button-add-member"><Plus size={15}/> Add member</Btn>}/>
    <Panel className="overflow-hidden">
      <div className="flex flex-col gap-3 border-b border-border p-4 md:flex-row md:items-center"><div className="relative flex-1"><Search size={15} className="absolute left-3 top-3 text-muted-foreground"/><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search name, email, or membership…" className={`${inputClass} pl-9`} data-testid="input-member-search"/></div><div className="grid grid-cols-2 gap-2 md:flex"><select value={status} onChange={e=>setStatus(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-xs" data-testid="filter-member-status">{['All statuses','active','pending','medical hold','expired'].map(x=><option key={x}>{x}</option>)}</select><select value={type} onChange={e=>setType(e.target.value)} className="h-10 rounded-lg border border-input bg-background px-3 text-xs" data-testid="filter-member-type">{['All types',...MEMBER_TYPES].map(x=><option key={x}>{x}</option>)}</select></div></div>
      <QueryState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>
        {query.data?.length?<div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left"><thead><tr className="border-b border-border bg-background/60 text-[10px] uppercase tracking-[.1em] text-muted-foreground"><th className="px-5 py-3 font-semibold">Member</th><th className="px-4 py-3 font-semibold">Membership</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Days left</th><th className="px-4 py-3 font-semibold">Member since</th><th className="px-4 py-3"></th></tr></thead><tbody>{query.data.map(member=><tr key={member.id} className="border-b border-border/70 last:border-0 hover:bg-background/60" data-testid={`row-member-${member.id}`}><td className="px-5 py-3.5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-secondary text-[10px] font-bold text-primary">{member.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div><div className="text-xs font-semibold" data-testid={`text-member-name-${member.id}`}>{member.name}</div><div className="mt-0.5 text-[10px] text-muted-foreground">{member.email||`Member #${member.id}`}</div></div></div></td><td className="px-4 py-3.5"><div className="text-xs font-medium">{member.plan}</div><div className="mt-0.5 text-[10px] capitalize text-muted-foreground">{member.type}</div></td><td className="px-4 py-3.5"><StatusPill status={member.status}/>{member.injury&&<div className="mt-1 text-[9px] text-[#9c6634]">Medical note</div>}</td><td className="px-4 py-3.5"><span className={cx('font-[var(--app-font-mono)] text-xs font-semibold',member.days<=14?'text-[#a65e43]':'')}>{member.days}</span></td><td className="px-4 py-3.5 text-xs text-muted-foreground">{dateOnly(member.createdAt)}</td><td className="px-4 py-3.5 text-right"><div className="flex justify-end gap-1"><button onClick={()=>setEditing(member)} className="rounded-lg px-2.5 py-2 text-[10px] font-semibold text-primary hover:bg-primary/10" data-testid={`button-edit-member-${member.id}`}>Edit</button><button onClick={()=>setConfirmDelete(member)} aria-label={`Delete ${member.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-member-${member.id}`}><X size={14}/></button></div></td></tr>)}</tbody></table></div>:<Empty title="No members match this search" detail="Try another name or adjust the filters. New members can be added from the button above."/>}
      </QueryState>
      <div className="flex items-center justify-between border-t border-border px-5 py-3 text-[10px] text-muted-foreground"><span data-testid="text-member-count">{query.data?.length??0} members shown</span><span>Membership records</span></div>
    </Panel>
    {editing!==false&&<MemberModal member={editing} close={()=>setEditing(false)} onSaved={invalidate}/>}
    {confirmDelete&&<Modal title="Remove member?" close={()=>setConfirmDelete(null)}><p className="text-sm text-muted-foreground">This will permanently remove <strong className="text-foreground">{confirmDelete.name}</strong> and their membership record.</p><div className="mt-6 flex justify-end gap-2"><Btn variant="outline" onClick={()=>setConfirmDelete(null)} testId="button-cancel-delete-member">Keep member</Btn><Btn variant="danger" disabled={del.isPending} onClick={()=>del.mutate({id:confirmDelete.id},{onSuccess:()=>{setConfirmDelete(null);invalidate();}})} testId="button-confirm-delete-member">{del.isPending?'Removing…':'Remove member'}</Btn></div><ErrorNote error={del.isError}/></Modal>}
  </>;
}
function MemberModal({member,close,onSaved}: {member:GymMember|null;close:()=>void;onSaved:()=>void}) {
  const create=useCreateGymMember();const update=useUpdateGymMember();
  const initialType=member?.type??'Player';const initialPlan=member?.plan??PLANS_BY_TYPE[initialType]?.[0]??'Squad';
  const [name,setName]=useState(member?.name??'');const [email,setEmail]=useState(member?.email??'');const [phone,setPhone]=useState(member?.phone??'');const [type,setType]=useState(initialType);const [plan,setPlan]=useState(initialPlan);const [status,setStatus]=useState(member?.status==='hold'?'medical hold':member?.status??'active');const [days,setDays]=useState(String(member?.days??PLAN_DURATIONS[initialPlan]??365));const [injury,setInjury]=useState(member?.injury??'');
  const planOptions=[...new Set([...(PLANS_BY_TYPE[type]??[]),...(member?.plan&&!PLANS_BY_TYPE[type]?.includes(member.plan)?[member.plan]:[])])];
  const submit=(e:FormEvent)=>{e.preventDefault();const data={name:name.trim(),email:email||null,phone:phone||null,type,plan,status,days:Number(days),injury:injury||null};const done=()=>{onSaved();close();};if(member)update.mutate({id:member.id,data},{onSuccess:done});else create.mutate({data},{onSuccess:done});};
  const busy=create.isPending||update.isPending;
  return <Modal title={member?'Edit member':'Add a member'} close={close}><form onSubmit={submit} className="space-y-4"><Field label="Full name"><input required value={name} onChange={e=>setName(e.target.value)} className={inputClass} placeholder="Member name" data-testid="input-member-name"/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Email"><input type="email" value={email??''} onChange={e=>setEmail(e.target.value)} className={inputClass} placeholder="name@example.com" data-testid="input-member-email"/></Field><Field label="Phone"><input value={phone??''} onChange={e=>setPhone(e.target.value)} className={inputClass} placeholder="+220" data-testid="input-member-phone"/></Field><SelectField label="Member type" value={type} onChange={value=>{setType(value);const firstPlan=PLANS_BY_TYPE[value]?.[0]??'Squad';setPlan(firstPlan);setDays(String(PLAN_DURATIONS[firstPlan]??365));}} options={[...new Set([type,...MEMBER_TYPES])]} testId="select-member-type"/><SelectField label="Membership plan" value={plan} onChange={value=>{setPlan(value);setDays(String(PLAN_DURATIONS[value]??30));}} options={planOptions.length?planOptions:[plan]} testId="select-member-plan"/><SelectField label="Status" value={status} onChange={setStatus} options={['active','pending','medical hold','expired']} testId="select-member-status"/><Field label="Days remaining"><input type="number" min="0" value={days} onChange={e=>setDays(e.target.value)} className={inputClass} data-testid="input-member-days"/></Field></div><Field label="Injury or medical note"><input value={injury??''} onChange={e=>setInjury(e.target.value)} className={inputClass} placeholder="Optional note for staff" data-testid="input-member-injury"/></Field><ErrorNote error={create.isError||update.isError}/><div className="flex justify-end gap-2 pt-2"><Btn variant="outline" onClick={close} testId="button-cancel-member">Cancel</Btn><Btn type="submit" disabled={!name.trim()||busy} testId="button-save-member">{busy?'Saving…':member?'Save changes':'Create member'}</Btn></div></form></Modal>;
}

function ApprovalsPage() {
  const qc=useQueryClient();const query=useListGymApprovals();const decide=useDecideGymMemberApproval();const [errorId,setErrorId]=useState<number|null>(null);
  const act=(id:number,decision:'approved'|'rejected')=>decide.mutate({id,data:{decision}},{onSuccess:()=>{setErrorId(null);void qc.invalidateQueries({queryKey:getListGymApprovalsQueryKey()});void qc.invalidateQueries({queryKey:getListGymMembersQueryKey()});void qc.invalidateQueries({queryKey:getGetGymDashboardQueryKey()});void qc.invalidateQueries({queryKey:getGetGymActivityQueryKey()});},onError:()=>setErrorId(id)});
  return <><Heading eyebrow="Membership · Review queue" title="Registration approvals" subtitle="A quick check before new members are welcomed onto the floor."/>{query.data?.length&&!query.isLoading&&<div className="mb-4 flex items-center gap-3 rounded-xl border border-[#eadcb5] bg-[#f7f0df] px-4 py-3 text-xs text-[#725e2e]"><BadgeCheck size={16}/><span><strong>{query.data.length} registrations</strong> are waiting for a decision.</span></div>}<QueryState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>{query.data?.length?<div className="grid gap-3 lg:grid-cols-2">{query.data.map((member,i)=><Panel key={member.id} className="overflow-hidden" ><div className="flex items-start gap-4 p-5"><div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-secondary font-[var(--app-font-mono)] text-sm font-semibold text-primary">{member.name.split(' ').map(x=>x[0]).slice(0,2).join('')}</div><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><h2 className="text-sm font-semibold" data-testid={`approval-name-${member.id}`}>{member.name}</h2><StatusPill status={member.status}/></div><p className="mt-1 text-[11px] text-muted-foreground">{member.plan} · <span className="capitalize">{member.type}</span> member</p><div className="mt-4 grid grid-cols-2 gap-3 rounded-xl bg-background/70 p-3"><div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Contact</div><div className="mt-1 truncate text-[11px]">{member.email||member.phone||'No contact provided'}</div></div><div><div className="text-[9px] uppercase tracking-wider text-muted-foreground">Applied</div><div className="mt-1 text-[11px]">{dateOnly(member.createdAt)}</div></div></div><div className="mt-4 flex justify-end gap-2"><Btn variant="outline" disabled={decide.isPending} onClick={()=>act(member.id,'rejected')} testId={`button-reject-${member.id}`}><XCircle size={14}/> Decline</Btn><Btn disabled={decide.isPending} onClick={()=>act(member.id,'approved')} testId={`button-approve-${member.id}`}><CheckCircle2 size={14}/> Approve</Btn></div>{errorId===member.id&&<div className="mt-2 text-right text-[10px] text-destructive" data-testid={`approval-error-${member.id}`}>Decision failed. Try again.</div>}</div></div></Panel>)}</div>:<Panel><Empty title="All caught up" detail="There are no registrations waiting for review. New public sign-ups will appear here."/></Panel>}</QueryState></>;
}

function SessionsPage() {
  const qc=useQueryClient();const query=useListGymSessions();const members=useListGymMembers();const create=useCreateGymSession();const update=useUpdateGymSession();const del=useDeleteGymSession();const booking=useChangeGymBooking();
  const [editing,setEditing]=useState<GymSession|null|false>(false);const [remove,setRemove]=useState<GymSession|null>(null);const [bookingSession,setBookingSession]=useState<GymSession|null>(null);const [memberId,setMemberId]=useState('');
  const invalidate=()=>{void qc.invalidateQueries({queryKey:getListGymSessionsQueryKey()});void qc.invalidateQueries({queryKey:getGetGymActivityQueryKey()});};
  const submitSession=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);const data={name:String(fd.get('name')),coach:String(fd.get('coach')),startsAt:new Date(String(fd.get('startsAt'))).toISOString(),capacity:Number(fd.get('capacity'))};if(editing){update.mutate({id:editing.id,data},{onSuccess:()=>{setEditing(false);invalidate();}});}else create.mutate({data},{onSuccess:()=>{setEditing(false);invalidate();}});};
  const changeBooking=(action:'book'|'cancel')=>{if(!bookingSession||!memberId)return;booking.mutate({id:bookingSession.id,data:{memberId:Number(memberId),action}},{onSuccess:()=>{setBookingSession(null);setMemberId('');invalidate();}});};
  return <><Heading eyebrow="Programme · Club timetable" title="Sessions" subtitle="Keep the weekly programme moving. Manage capacity and member bookings." action={<Btn onClick={()=>setEditing(null)} testId="button-create-session"><Plus size={15}/> Add session</Btn>}/>
    <QueryState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>{query.data?.length?<div className="grid gap-4 xl:grid-cols-2">{query.data.map(session=>{const filled=session.capacity?Math.min(100,session.bookedCount/session.capacity*100):0;return <Panel key={session.id} className="overflow-hidden" ><div className="flex items-start justify-between p-5"><div className="flex gap-4"><div className="flex h-[58px] w-[58px] flex-col items-center justify-center rounded-xl bg-primary text-primary-foreground"><span className="text-[9px] uppercase">{new Date(session.startsAt).toLocaleDateString('en-GB',{month:'short'})}</span><span className="font-[var(--app-font-mono)] text-xl font-semibold leading-5">{new Date(session.startsAt).getDate()}</span></div><div><h2 className="text-sm font-semibold" data-testid={`session-name-${session.id}`}>{session.name}</h2><div className="mt-1 text-[11px] text-muted-foreground">{dateTime(session.startsAt)}</div><div className="mt-1 text-[11px] text-muted-foreground">Coach <span className="font-medium text-foreground">{session.coach}</span></div></div></div><div className="flex gap-1"><button onClick={()=>setEditing(session)} className="rounded-lg px-2.5 py-2 text-[10px] font-semibold text-primary hover:bg-primary/10" data-testid={`button-edit-session-${session.id}`}>Edit</button><button onClick={()=>setRemove(session)} aria-label={`Delete ${session.name}`} className="rounded-lg p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive" data-testid={`button-delete-session-${session.id}`}><X size={14}/></button></div></div><div className="px-5 pb-5"><div className="mb-2 flex items-center justify-between text-[10px]"><span className="text-muted-foreground">Places booked</span><span className="font-[var(--app-font-mono)] font-semibold">{session.bookedCount} <span className="text-muted-foreground">/ {session.capacity}</span></span></div><div className="h-1.5 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary" style={{width:`${filled}%`}}/></div><div className="mt-4 flex items-center justify-between"><div className="flex -space-x-2">{session.bookedMemberIds.slice(0,4).map((id,i)=><div key={id} className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-secondary text-[8px] font-bold text-primary" title={`Member #${id}`}>{members.data?.find(m=>m.id===id)?.name.split(' ').map(x=>x[0]).slice(0,2).join('')??String(id).slice(-2)}</div>)}{session.bookedCount>4&&<div className="grid h-7 w-7 place-items-center rounded-full border-2 border-card bg-muted text-[8px] font-bold">+{session.bookedCount-4}</div>}</div><Btn variant="outline" onClick={()=>setBookingSession(session)} testId={`button-manage-bookings-${session.id}`}><Users size={14}/> Manage bookings</Btn></div></div></Panel>})}</div>:<Panel><Empty title="No sessions scheduled" detail="Build your programme by adding the next class or training session."/></Panel>}</QueryState>
    {editing!==false&&<Modal title={editing?'Edit session':'Schedule a session'} close={()=>setEditing(false)}><form onSubmit={submitSession} className="space-y-4"><Field label="Session name"><input name="name" required defaultValue={editing?.name??''} className={inputClass} placeholder="Strength & conditioning" data-testid="input-session-name"/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Coach"><input name="coach" required defaultValue={editing?.coach??''} className={inputClass} placeholder="Coach name" data-testid="input-session-coach"/></Field><Field label="Capacity"><input name="capacity" required min="1" type="number" defaultValue={editing?.capacity??12} className={inputClass} data-testid="input-session-capacity"/></Field></div><Field label="Start time"><input name="startsAt" required type="datetime-local" defaultValue={editing?new Date(new Date(editing.startsAt).getTime()-new Date(editing.startsAt).getTimezoneOffset()*60000).toISOString().slice(0,16):''} className={inputClass} data-testid="input-session-starts-at"/></Field>{(create.isError||update.isError)&&<ErrorNote error/>}<div className="flex justify-end gap-2 pt-2"><Btn variant="outline" onClick={()=>setEditing(false)} testId="button-cancel-session">Cancel</Btn><Btn type="submit" disabled={create.isPending||update.isPending} testId="button-save-session">Save session</Btn></div></form></Modal>}
    {bookingSession&&<Modal title="Manage member bookings" close={()=>setBookingSession(null)}><div className="mb-4 rounded-xl bg-background p-3"><div className="text-xs font-semibold">{bookingSession.name}</div><div className="mt-1 text-[10px] text-muted-foreground">{dateTime(bookingSession.startsAt)} · {bookingSession.bookedCount}/{bookingSession.capacity} places taken</div></div><SelectField label="Select a member" value={memberId} onChange={setMemberId} options={['',...(members.data??[]).map(m=>String(m.id))]} testId="select-booking-member"/><p className="mt-1 text-[10px] text-muted-foreground">Select the member's name is unavailable; IDs are shown below.</p><div className="mt-2 max-h-36 overflow-y-auto rounded-lg border border-border">{members.data?.map(m=><button type="button" key={m.id} onClick={()=>setMemberId(String(m.id))} className={cx('flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-[11px] last:border-0 hover:bg-muted',memberId===String(m.id)&&'bg-primary/5')} data-testid={`option-booking-member-${m.id}`}><span>{m.name}</span><span className="text-muted-foreground">#{m.id}</span></button>)}</div><div className="mt-5 flex justify-end gap-2"><Btn variant="outline" disabled={!memberId||booking.isPending} onClick={()=>changeBooking('cancel')} testId="button-cancel-booking"><X size={14}/> Cancel booking</Btn><Btn disabled={!memberId||booking.isPending||bookingSession.bookedCount>=bookingSession.capacity} onClick={()=>changeBooking('book')} testId="button-book-member"><Check size={14}/> Book member</Btn></div><ErrorNote error={booking.isError}/></Modal>}
    {remove&&<Modal title="Delete this session?" close={()=>setRemove(null)}><p className="text-sm text-muted-foreground">Remove <strong className="text-foreground">{remove.name}</strong> from the timetable?</p><div className="mt-6 flex justify-end gap-2"><Btn variant="outline" onClick={()=>setRemove(null)} testId="button-cancel-delete-session">Keep session</Btn><Btn variant="danger" disabled={del.isPending} onClick={()=>del.mutate({id:remove.id},{onSuccess:()=>{setRemove(null);invalidate();}})} testId="button-confirm-delete-session">Delete session</Btn></div><ErrorNote error={del.isError}/></Modal>}
  </>;
}

function TrainingPage() {
  const qc=useQueryClient();const members=useListGymMembers();const [selected,setSelected]=useState('');const logs=useListGymTrainingLogs(selected?{memberId:Number(selected)}:{memberId:0},{query:{enabled:!!selected,queryKey:getListGymTrainingLogsQueryKey({memberId:Number(selected)})}});const create=useCreateGymTrainingLog();
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);create.mutate({data:{memberId:Number(selected),exercise:String(fd.get('exercise')),sets:Number(fd.get('sets')),reps:String(fd.get('reps')),load:String(fd.get('load'))}},{onSuccess:()=>{void qc.invalidateQueries({queryKey:getListGymTrainingLogsQueryKey({memberId:Number(selected)})});void qc.invalidateQueries({queryKey:getGetGymActivityQueryKey()});e.currentTarget.reset();}});};
  return <><Heading eyebrow="Coaching · Member care" title="Training log" subtitle="Capture meaningful training work and keep a readable history for each member."/>
    <div className="grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><Panel title="Log an exercise"><form onSubmit={submit} className="space-y-4 p-5"><SelectField label="Member" value={selected} onChange={setSelected} options={['',...(members.data??[]).map(m=>String(m.id))]} testId="select-training-member"/><div className="max-h-32 overflow-y-auto rounded-lg border border-border">{members.data?.map(m=><button key={m.id} type="button" onClick={()=>setSelected(String(m.id))} className={cx('flex w-full items-center justify-between border-b border-border px-3 py-2 text-left text-[11px] last:border-0 hover:bg-muted',selected===String(m.id)&&'bg-primary/5')} data-testid={`option-training-member-${m.id}`}><span>{m.name}</span><span className="text-muted-foreground">#{m.id}</span></button>)}</div><Field label="Exercise"><input name="exercise" required className={inputClass} placeholder="e.g. Goblet squat" data-testid="input-training-exercise"/></Field><div className="grid grid-cols-3 gap-3"><Field label="Sets"><input name="sets" min="1" required type="number" className={inputClass} placeholder="3" data-testid="input-training-sets"/></Field><Field label="Reps"><input name="reps" required className={inputClass} placeholder="8–10" data-testid="input-training-reps"/></Field><Field label="Load"><input name="load" required className={inputClass} placeholder="16 kg" data-testid="input-training-load"/></Field></div><ErrorNote error={create.isError}/><Btn type="submit" disabled={!selected||create.isPending} testId="button-save-training-log"><FilePlus2 size={15}/> {create.isPending?'Saving…':'Save exercise log'}</Btn></form></Panel>
      <Panel title={selected?`Training history · ${members.data?.find(m=>String(m.id)===selected)?.name??`Member #${selected}`}`:'Member training history'} action={<span className="text-[10px] text-muted-foreground">{selected?`${logs.data?.length??0} entries`:'Select a member'}</span>}>
        {!selected?<Empty title="Choose a member to begin" detail="Select someone on the left to view their exercise history and add a new training entry."/>:logs.isLoading?<LoadingRows/>:logs.isError?<div className="p-5 text-xs text-destructive" data-testid="state-training-error">Training history couldn't be loaded. Please try again.</div>:logs.data?.length?<div className="divide-y divide-border">{logs.data.map(log=><div key={log.id} className="flex items-center gap-4 px-5 py-4" data-testid={`row-training-log-${log.id}`}><div className="grid h-10 w-10 place-items-center rounded-xl bg-secondary text-primary"><Dumbbell size={17}/></div><div className="min-w-0 flex-1"><div className="text-xs font-semibold">{log.exercise}</div><div className="mt-1 text-[10px] text-muted-foreground">{log.sets} sets <span className="mx-1">·</span>{log.reps} reps <span className="mx-1">·</span>{log.load}</div></div><time className="text-[10px] text-muted-foreground">{dateTime(log.loggedAt)}</time></div>)}</div>:<Empty title="No training entries yet" detail="The first exercise logged for this member will start their history."/>}
      </Panel></div>
  </>;
}

function PaymentsPage() {
  const qc=useQueryClient();const query=useListGymPayments();const members=useListGymMembers();const create=useCreateGymPayment();const [open,setOpen]=useState(false);const [method,setMethod]=useState('card');
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);create.mutate({data:{memberId:Number(fd.get('memberId')),amount:Number(fd.get('amount')),method:String(fd.get('method'))}},{onSuccess:()=>{setOpen(false);void qc.invalidateQueries({queryKey:getListGymPaymentsQueryKey()});void qc.invalidateQueries({queryKey:getGetGymDashboardQueryKey()});void qc.invalidateQueries({queryKey:getGetGymActivityQueryKey()});}});};
  const total=query.data?.reduce((sum,p)=>sum+p.amount,0)??0;
  return <><Heading eyebrow="Finance · Transactions" title="Payments" subtitle="Record a payment and keep a clear trail of member transactions." action={<Btn onClick={()=>setOpen(true)} testId="button-record-payment"><Plus size={15}/> Record payment</Btn>}/>
    <div className="mb-5 grid gap-3 sm:grid-cols-2"><div className="rounded-2xl border border-card-border bg-card p-5"><div className="flex items-center justify-between"><span className="text-[11px] text-muted-foreground">Recorded payments</span><Banknote size={16} className="text-primary"/></div><div className="mt-3 font-[var(--app-font-mono)] text-2xl font-semibold" data-testid="text-payment-total">{money(total)}</div><div className="mt-1 text-[10px] text-muted-foreground">{query.data?.length??0} transactions in records</div></div><div className="rounded-2xl bg-[#172653] p-5 text-white"><div className="flex items-center justify-between"><span className="text-[11px] text-white/65">This month</span><Wallet size={16} className="text-[#b9c9ff]"/></div><div className="mt-3 font-[var(--app-font-mono)] text-2xl font-semibold">{query.data?.filter(p=>new Date(p.paidAt).getMonth()===new Date().getMonth()&&new Date(p.paidAt).getFullYear()===new Date().getFullYear()).reduce((sum,p)=>sum+p.amount,0)!==undefined?money(query.data?.filter(p=>new Date(p.paidAt).getMonth()===new Date().getMonth()&&new Date(p.paidAt).getFullYear()===new Date().getFullYear()).reduce((sum,p)=>sum+p.amount,0)??0):'—'}</div><div className="mt-1 text-[10px] text-white/60">Based on recorded transactions</div></div></div>
    <Panel title="Payment records" action={<span className="text-[10px] text-muted-foreground">Latest first</span>}><QueryState loading={query.isLoading} error={query.isError} retry={()=>void query.refetch()}>{query.data?.length?<div className="overflow-x-auto"><table className="w-full min-w-[600px] text-left"><thead><tr className="border-b border-border bg-background/60 text-[10px] uppercase tracking-[.1em] text-muted-foreground"><th className="px-5 py-3">Member</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Method</th><th className="px-4 py-3">Recorded</th><th className="px-4 py-3">Reference</th></tr></thead><tbody>{query.data.map(p=><tr key={p.id} className="border-b border-border/70 last:border-0" data-testid={`row-payment-${p.id}`}><td className="px-5 py-4 text-xs font-semibold">{p.memberName}</td><td className="px-4 py-4 font-[var(--app-font-mono)] text-xs font-semibold" data-testid={`text-payment-amount-${p.id}`}>{money(p.amount)}</td><td className="px-4 py-4"><span className="rounded-full bg-secondary px-2.5 py-1 text-[10px] font-semibold capitalize">{p.method}</span></td><td className="px-4 py-4 text-xs text-muted-foreground">{dateTime(p.paidAt)}</td><td className="px-4 py-4 font-[var(--app-font-mono)] text-[10px] text-muted-foreground">#{p.id.toString().padStart(5,'0')}</td></tr>)}</tbody></table></div>:<Empty title="No payments recorded" detail="Once a payment is entered, you will find its amount, method, and member here."/>}</QueryState></Panel>
    {open&&<Modal title="Record a payment" close={()=>setOpen(false)}><form onSubmit={submit} className="space-y-4"><Field label="Member"><select name="memberId" required className={inputClass} defaultValue="" data-testid="select-payment-member"><option value="" disabled>Select a member</option>{members.data?.map(m=><option key={m.id} value={m.id}>{m.name} · #{m.id}</option>)}</select></Field><Field label="Amount"><div className="relative"><span className="absolute left-3 top-2.5 text-sm text-muted-foreground">£</span><input name="amount" min="1" step="0.01" required type="number" className={`${inputClass} pl-8`} placeholder="0.00" data-testid="input-payment-amount"/></div></Field><SelectField label="Payment method" value={method} onChange={setMethod} options={['card','cash','bank transfer','direct debit']} testId="select-payment-method"/><input type="hidden" name="method" value={method}/><ErrorNote error={create.isError}/><div className="flex justify-end gap-2 pt-2"><Btn variant="outline" onClick={()=>setOpen(false)} testId="button-cancel-payment">Cancel</Btn><Btn type="submit" disabled={create.isPending} testId="button-save-payment">Record payment</Btn></div></form></Modal>}
  </>;
}
function SignUpQrPage() {
  const [copyState,setCopyState]=useState<'idle'|'copied'|'error'>('idle');
  const joinPath=`${import.meta.env.BASE_URL.replace(/\/$/,'')}/join`;
  const registrationUrl=new URL(joinPath,window.location.origin).toString();
  const copyLink=async()=>{try{await navigator.clipboard.writeText(registrationUrl);setCopyState('copied');}catch{setCopyState('error');}};
  const downloadQr=()=>{const svg=document.querySelector('[data-testid="qr-membership-signup"] svg');if(!(svg instanceof SVGSVGElement))return;const content=new XMLSerializer().serializeToString(svg);const blob=new Blob([content],{type:'image/svg+xml;charset=utf-8'});const url=URL.createObjectURL(blob);const link=document.createElement('a');link.href=url;link.download='falcons-fc-membership-signup.svg';link.click();window.setTimeout(()=>URL.revokeObjectURL(url),1000);};
  return <>
    <Heading eyebrow="New memberships" title="Sign-up QR code" subtitle="Share this code so prospective members can open the registration form on their phone."/>
    <div className="grid gap-5 xl:grid-cols-[1fr_.9fr]">
      <Panel title="Scan to register">
        <div className="flex flex-col items-center p-6 text-center">
          <div data-testid="qr-membership-signup" className="rounded-2xl border border-border bg-white p-4 shadow-sm"><QRCodeSVG value={registrationUrl} size={224} level="H" marginSize={3} fgColor="#2340b3" title="Scan to open club membership registration"/></div>
          <p className="mt-4 text-sm font-semibold">Membership registration</p>
          <p className="mt-1 max-w-sm text-xs leading-relaxed text-muted-foreground">Scan with a phone camera to choose a membership type and submit a request for staff approval.</p>
          <div className="mt-5 flex flex-wrap justify-center gap-2"><Btn onClick={downloadQr} variant="outline" testId="button-download-signup-qr"><Download size={14}/> Download QR</Btn><Btn onClick={copyLink} variant="outline" testId="button-copy-registration-link"><Copy size={14}/>{copyState==='copied'?'Link copied':'Copy link'}</Btn></div>
          {copyState==='error'&&<p className="mt-2 text-xs text-destructive" role="alert">Could not copy automatically. Select and copy the link shown beside the QR code.</p>}
        </div>
      </Panel>
      <div className="space-y-5">
        <Panel title="Registration link"><div className="p-5"><p className="text-xs leading-relaxed text-muted-foreground">This is the destination encoded in the QR code. Share it directly or download the QR image to print.</p><a href={registrationUrl} target="_blank" rel="noreferrer" className="mt-4 block break-all rounded-lg border border-border bg-background px-3 py-3 font-[var(--app-font-mono)] text-[11px] text-primary hover:underline" data-testid="link-registration-url">{registrationUrl}</a><Link href="/join" className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline" data-testid="link-preview-registration">Preview the registration form <ArrowRight size={13}/></Link></div></Panel>
        <Panel title="What happens next"><div className="space-y-3 p-5"><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-primary">1</span><p className="pt-1 text-xs leading-relaxed">The member selects a type and plan, then enters their contact details.</p></div><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-primary">2</span><p className="pt-1 text-xs leading-relaxed">Their request is saved as pending and appears in Approvals.</p></div><div className="flex gap-3"><span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-secondary text-[11px] font-bold text-primary">3</span><p className="pt-1 text-xs leading-relaxed">Staff review and approve the request before the membership is activated.</p></div></div></Panel>
      </div>
    </div>
    <p className="mt-4 text-[10px] text-muted-foreground">The QR code uses the address you opened this page on. Publish the app before printing it for members.</p>
  </>;
}

function JoinPage() {
  const register=useRegisterGymMember();const [submitted,setSubmitted]=useState(false);const [type,setType]=useState('Public');const [plan,setPlan]=useState(PLANS_BY_TYPE.Public[0]);
  const submit=(e:FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);register.mutate({data:{name:String(fd.get('name')),email:String(fd.get('email'))||null,phone:String(fd.get('phone'))||null,type,plan}},{onSuccess:()=>{setSubmitted(true);void queryClient.invalidateQueries({queryKey:getListGymApprovalsQueryKey()});void queryClient.invalidateQueries({queryKey:getGetGymDashboardQueryKey()});void queryClient.invalidateQueries({queryKey:getGetGymActivityQueryKey()});}});};
  return <div className="app-grain min-h-[100dvh] bg-[#f4f6fd]"><header className="flex h-[74px] items-center justify-between border-b border-[#dbe2f2] px-5 sm:px-10"><Link href="/" className="flex items-center gap-3 text-foreground" data-testid="link-join-brand"><img src={clubCrestUrl} alt="Falcons FC crest" className="h-9 w-9 rounded-xl bg-white object-contain p-0.5"/><span className="font-[var(--app-font-mono)] text-sm font-bold tracking-tight">FALCONS FC</span></Link><span className="text-[10px] font-bold uppercase tracking-[.19em] text-muted-foreground">Member registration</span></header><main className="mx-auto grid max-w-[1120px] gap-10 px-5 py-10 md:grid-cols-[.9fr_1.1fr] md:items-center md:py-16">
    <div className="relative overflow-hidden rounded-[28px] bg-[#172653] p-7 text-white md:min-h-[520px] md:p-10"><div className="absolute -right-16 -top-12 h-64 w-64 rounded-full border border-white/10"/><div className="absolute -right-7 -top-3 h-44 w-44 rounded-full border border-white/10"/><div className="relative"><span className="inline-flex items-center gap-2 rounded-full border border-white/15 px-3 py-1.5 text-[9px] font-bold uppercase tracking-[.17em] text-[#b9c9ff]"><span className="h-1.5 w-1.5 rounded-full bg-[#b9c9ff]"/> Falcons Football Club</span><h1 className="mt-10 max-w-md font-[var(--app-font-mono)] text-4xl font-semibold leading-[1.08] tracking-[-.055em] sm:text-5xl">Make room<br/>for your next.</h1><p className="mt-5 max-w-sm text-sm leading-relaxed text-white/65">Training, recovery, community. Start with a few details and our team will be in touch to welcome you in.</p><div className="mt-12 border-t border-white/15 pt-5"><div className="flex items-center gap-3"><div className="grid h-9 w-9 place-items-center rounded-full bg-white text-[#2340b3]"><Dumbbell size={15}/></div><div><div className="text-xs font-semibold">Your local training ground</div><div className="mt-1 text-[10px] text-white/50">Every level. Every season.</div></div></div></div></div></div>
    <div className="mx-auto w-full max-w-[500px]">{submitted?<div className="rounded-2xl border border-card-border bg-card p-8 text-center shadow-sm" data-testid="registration-success"><div className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-[#e7f0e8] text-primary"><CheckCircle2 size={25}/></div><h2 className="mt-5 font-[var(--app-font-mono)] text-2xl font-semibold">You're on the list.</h2><p className="mt-2 text-sm leading-relaxed text-muted-foreground">Your registration is with the club team for review. We'll be in touch soon.</p><Link href="/" className="mt-6 inline-flex items-center gap-2 text-xs font-semibold text-primary hover:underline" data-testid="link-return-home">Back to club operations <ArrowRight size={14}/></Link></div>:<><div className="mb-6"><div className="mb-2 text-[10px] font-bold uppercase tracking-[.2em] text-primary">Your first step</div><h2 className="font-[var(--app-font-mono)] text-3xl font-semibold tracking-[-.04em]">Join the club</h2><p className="mt-2 text-xs leading-relaxed text-muted-foreground">Choose a membership and leave your details. Registration is reviewed by our team before membership is activated.</p></div><Panel><form onSubmit={submit} className="space-y-4 p-5 sm:p-6"><Field label="Full name"><input name="name" required className={inputClass} placeholder="Your name" data-testid="input-join-name"/></Field><div className="grid gap-4 sm:grid-cols-2"><Field label="Email address"><input name="email" required type="email" className={inputClass} placeholder="you@example.com" data-testid="input-join-email"/></Field><Field label="Phone number"><input name="phone" className={inputClass} placeholder="+220" data-testid="input-join-phone"/></Field></div><SelectField label="Membership type" value={type} onChange={value=>{setType(value);setPlan(PLANS_BY_TYPE[value]?.[0]??'Squad');}} options={MEMBER_TYPES} testId="select-join-type"/><SelectField label="Plan of interest" value={plan} onChange={setPlan} options={PLANS_BY_TYPE[type]??['Squad']} testId="select-join-plan"/><ErrorNote error={register.isError}/><Btn type="submit" disabled={register.isPending} testId="button-submit-registration">{register.isPending?'Sending registration…':<>Send registration <ArrowRight size={15}/></>}</Btn><p className="text-[10px] leading-relaxed text-muted-foreground">Your details are shared with club staff to review this membership request.</p></form></Panel></>}</div>
  </main></div>;
}
function NotFound() { return <Panel><Empty title="Page not found" detail="This part of club operations isn't on the timetable."/><div className="pb-6 text-center"><Link href="/" className="text-xs font-semibold text-primary hover:underline" data-testid="link-not-found-home">Return to overview</Link></div></Panel>; }

export default App;