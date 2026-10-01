import { Router, type IRouter } from "express";
import { and, desc, eq, gte, ilike, or } from "drizzle-orm";
import {
  db,
  gymCheckinsTable,
  gymMembersTable,
  gymPaymentsTable,
  gymSessionBookingsTable,
  gymSessionsTable,
  gymTrainingLogsTable,
} from "@workspace/db";
import {
  ChangeGymBookingBody,
  ChangeGymBookingParams,
  ChangeGymBookingResponse,
  CreateGymCheckinBody,
  CreateGymCheckinResponse,
  CreateGymMemberBody,
  CreateGymMemberResponse,
  CreateGymPaymentBody,
  CreateGymPaymentResponse,
  CreateGymSessionBody,
  CreateGymSessionResponse,
  CreateGymTrainingLogBody,
  CreateGymTrainingLogResponse,
  DecideGymMemberApprovalBody,
  DecideGymMemberApprovalParams,
  DecideGymMemberApprovalResponse,
  DeleteGymMemberParams,
  DeleteGymSessionParams,
  GetGymActivityResponse,
  GetGymDashboardResponse,
  ListGymApprovalsResponse,
  ListGymCheckinsResponse,
  ListGymMembersQueryParams,
  ListGymMembersResponse,
  ListGymPaymentsResponse,
  ListGymSessionsResponse,
  ListGymTrainingLogsQueryParams,
  ListGymTrainingLogsResponse,
  RegisterGymMemberBody,
  RegisterGymMemberResponse,
  UpdateGymMemberBody,
  UpdateGymMemberParams,
  UpdateGymMemberResponse,
  UpdateGymSessionBody,
  UpdateGymSessionParams,
  UpdateGymSessionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();
const DAY_MS = 86_400_000;
const PLAN_DAYS: Record<string, number> = {
  Squad: 365,
  Academy: 365,
  Staff: 365,
  "Monthly D1,500": 30,
  "Quarterly D4,000": 90,
  Monthly: 30,
  Annual: 365,
  "Off-peak": 30,
  Student: 30,
  Junior: 30,
  Family: 30,
};
const MEMBER_STATUSES = new Set(["active", "pending", "hold", "expired", "rejected"]);
const normalizeStatus = (status: string) =>
  status.toLowerCase() === "medical hold" ? "hold" : status;

const addDays = (days: number) => new Date(Date.now() + days * DAY_MS);
const startOfToday = () => {
  const date = new Date();
  date.setUTCHours(0, 0, 0, 0);
  return date;
};
const daysRemaining = (end: Date | null) =>
  end ? Math.ceil((end.getTime() - Date.now()) / DAY_MS) : 365;
const memberOutput = (member: typeof gymMembersTable.$inferSelect) => {
  const days = daysRemaining(member.membershipEndsAt);
  return {
    id: member.id,
    name: member.name,
    type: member.type,
    plan: member.plan,
    status:
      member.status === "active" && days <= 0
        ? "expired"
        : member.status,
    days,
    injury: member.injury,
    email: member.email,
    phone: member.phone,
    createdAt: member.createdAt.toISOString(),
  };
};
const sessionOutput = (
  session: typeof gymSessionsTable.$inferSelect,
  bookings: { memberId: number }[],
) => ({
  id: session.id,
  name: session.name,
  startsAt: session.startsAt.toISOString(),
  coach: session.coach,
  capacity: session.capacity,
  bookedCount: bookings.length,
  bookedMemberIds: bookings.map((booking) => booking.memberId),
});
const memberNameLookup = async (memberId: number) => {
  const [member] = await db
    .select({ name: gymMembersTable.name })
    .from(gymMembersTable)
    .where(eq(gymMembersTable.id, memberId));
  return member?.name ?? "Unknown member";
};
const serializeCheckin = (
  checkin: typeof gymCheckinsTable.$inferSelect,
  memberName: string,
) => ({
  id: checkin.id,
  memberId: checkin.memberId,
  memberName,
  checkedInAt: checkin.checkedInAt.toISOString(),
  allowed: checkin.allowed,
  message: checkin.message,
});
const serializePayment = (
  payment: typeof gymPaymentsTable.$inferSelect,
  memberName: string,
) => ({
  id: payment.id,
  memberId: payment.memberId,
  memberName,
  amount: payment.amount,
  method: payment.method,
  paidAt: payment.paidAt.toISOString(),
});
const serializeTrainingLog = (log: typeof gymTrainingLogsTable.$inferSelect) => ({
  id: log.id,
  memberId: log.memberId,
  exercise: log.exercise,
  sets: log.sets,
  reps: log.reps,
  load: log.load,
  loggedAt: log.loggedAt.toISOString(),
});

router.get("/gym/dashboard", async (_req, res): Promise<void> => {
  const [members, todayCheckins, payments, weekCheckins] = await Promise.all([
    db.select().from(gymMembersTable),
    db
      .select()
      .from(gymCheckinsTable)
      .where(gte(gymCheckinsTable.checkedInAt, startOfToday())),
    db
      .select()
      .from(gymPaymentsTable)
      .where(gte(gymPaymentsTable.paidAt, new Date(new Date().getFullYear(), new Date().getMonth(), 1))),
    db
      .select()
      .from(gymCheckinsTable)
      .where(gte(gymCheckinsTable.checkedInAt, new Date(Date.now() - 6 * DAY_MS))),
  ]);
  const activeMembers = members.map(memberOutput);
  const attendance = Array.from({ length: 7 }, (_, offset) => {
    const date = new Date(Date.now() - (6 - offset) * DAY_MS);
    const day = date.toLocaleDateString("en", { weekday: "short", timeZone: "UTC" });
    const key = date.toISOString().slice(0, 10);
    return {
      day,
      count: weekCheckins.filter(
        (checkin) =>
          checkin.allowed && checkin.checkedInAt.toISOString().slice(0, 10) === key,
      ).length,
    };
  });
  const result = {
    checkedInToday: todayCheckins.filter((checkin) => checkin.allowed).length,
    activeMembers: activeMembers.filter((member) => member.status === "active").length,
    expiringSoon: activeMembers.filter(
      (member) => member.status === "active" && member.days >= 0 && member.days <= 7,
    ).length,
    medicalHold: activeMembers.filter((member) => member.status === "hold").length,
    awaitingApproval: activeMembers.filter((member) => member.status === "pending").length,
    revenueThisMonth: payments.reduce((total, payment) => total + payment.amount, 0),
    attendance,
  };
  res.json(GetGymDashboardResponse.parse(result));
});

router.get("/gym/activity", async (_req, res): Promise<void> => {
  const [members, checkins, payments, logs] = await Promise.all([
    db.select().from(gymMembersTable).orderBy(desc(gymMembersTable.createdAt)).limit(8),
    db.select().from(gymCheckinsTable).orderBy(desc(gymCheckinsTable.checkedInAt)).limit(8),
    db.select().from(gymPaymentsTable).orderBy(desc(gymPaymentsTable.paidAt)).limit(8),
    db.select().from(gymTrainingLogsTable).orderBy(desc(gymTrainingLogsTable.loggedAt)).limit(8),
  ]);
  const activities = [
    ...members.map((member) => ({
      id: `member-${member.id}`,
      kind: member.status === "pending" ? "approval" : "member",
      label: member.status === "pending" ? "Registration received" : "Member added",
      detail: member.name,
      occurredAt: member.createdAt.toISOString(),
    })),
    ...await Promise.all(
      checkins.map(async (checkin) => ({
        id: `checkin-${checkin.id}`,
        kind: checkin.allowed ? "checkin" : "denied",
        label: checkin.allowed ? "Member checked in" : "Check-in denied",
        detail: await memberNameLookup(checkin.memberId),
        occurredAt: checkin.checkedInAt.toISOString(),
      })),
    ),
    ...await Promise.all(
      payments.map(async (payment) => ({
        id: `payment-${payment.id}`,
        kind: "payment",
        label: "Payment recorded",
        detail: `${await memberNameLookup(payment.memberId)} · D${payment.amount.toLocaleString()}`,
        occurredAt: payment.paidAt.toISOString(),
      })),
    ),
    ...await Promise.all(
      logs.map(async (log) => ({
        id: `training-${log.id}`,
        kind: "training",
        label: "Training set logged",
        detail: `${await memberNameLookup(log.memberId)} · ${log.exercise}`,
        occurredAt: log.loggedAt.toISOString(),
      })),
    ),
  ];
  activities.sort(
    (left, right) =>
      new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime(),
  );
  res.json(GetGymActivityResponse.parse(activities.slice(0, 12)));
});

router.get("/gym/members", async (req, res): Promise<void> => {
  const params = ListGymMembersQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const conditions = [];
  if (params.data.type && params.data.type !== "All") {
    conditions.push(eq(gymMembersTable.type, params.data.type));
  }
  if (params.data.status && params.data.status !== "All") {
    conditions.push(eq(gymMembersTable.status, normalizeStatus(params.data.status)));
  }
  if (params.data.search) {
    conditions.push(
      or(
        ilike(gymMembersTable.name, `%${params.data.search}%`),
        ilike(gymMembersTable.email, `%${params.data.search}%`),
        ilike(gymMembersTable.phone, `%${params.data.search}%`),
      )!,
    );
  }
  const members = await db
    .select()
    .from(gymMembersTable)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(gymMembersTable.createdAt));
  res.json(ListGymMembersResponse.parse(members.map(memberOutput)));
});

router.post("/gym/members", async (req, res): Promise<void> => {
  const parsed = CreateGymMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const normalizedStatus = input.status ? normalizeStatus(input.status) : "active";
  const status = MEMBER_STATUSES.has(normalizedStatus) ? normalizedStatus : "active";
  const [member] = await db
    .insert(gymMembersTable)
    .values({
      name: input.name.trim(),
      type: input.type,
      plan: input.plan,
      status,
      email: input.email ?? null,
      phone: input.phone ?? null,
      injury: input.injury ?? null,
      membershipEndsAt: addDays(input.days ?? PLAN_DAYS[input.plan] ?? 30),
    })
    .returning();
  res.status(201).json(CreateGymMemberResponse.parse(memberOutput(member)));
});

router.patch("/gym/members/:id", async (req, res): Promise<void> => {
  const params = UpdateGymMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGymMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid member details" });
    return;
  }
  const input = parsed.data;
  const update: Partial<typeof gymMembersTable.$inferInsert> = {};
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.type !== undefined) update.type = input.type;
  if (input.plan !== undefined) update.plan = input.plan;
  if (input.status !== undefined && MEMBER_STATUSES.has(normalizeStatus(input.status))) {
    update.status = normalizeStatus(input.status);
  }
  if (input.email !== undefined) update.email = input.email;
  if (input.phone !== undefined) update.phone = input.phone;
  if (input.injury !== undefined) update.injury = input.injury;
  if (input.days !== undefined) update.membershipEndsAt = addDays(input.days);
  const [member] = await db
    .update(gymMembersTable)
    .set(update)
    .where(eq(gymMembersTable.id, params.data.id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(UpdateGymMemberResponse.parse(memberOutput(member)));
});

router.delete("/gym/members/:id", async (req, res): Promise<void> => {
  const params = DeleteGymMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [member] = await db
    .delete(gymMembersTable)
    .where(eq(gymMembersTable.id, params.data.id))
    .returning({ id: gymMembersTable.id });
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/gym/approvals", async (_req, res): Promise<void> => {
  const members = await db
    .select()
    .from(gymMembersTable)
    .where(eq(gymMembersTable.status, "pending"))
    .orderBy(desc(gymMembersTable.createdAt));
  res.json(ListGymApprovalsResponse.parse(members.map(memberOutput)));
});

router.post("/gym/members/:id/approval", async (req, res): Promise<void> => {
  const params = DecideGymMemberApprovalParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = DecideGymMemberApprovalBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid approval decision" });
    return;
  }
  const [existing] = await db
    .select()
    .from(gymMembersTable)
    .where(eq(gymMembersTable.id, params.data.id));
  if (!existing) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  const status = parsed.data.decision === "approved" ? "active" : "rejected";
  const [member] = await db
    .update(gymMembersTable)
    .set({
      status,
      ...(status === "active"
        ? { membershipEndsAt: addDays(PLAN_DAYS[existing.plan] ?? 365) }
        : {}),
    })
    .where(eq(gymMembersTable.id, params.data.id))
    .returning();
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  res.json(DecideGymMemberApprovalResponse.parse(memberOutput(member)));
});

const loadSessions = async () => {
  const [sessions, bookings] = await Promise.all([
    db.select().from(gymSessionsTable).orderBy(gymSessionsTable.startsAt),
    db.select().from(gymSessionBookingsTable),
  ]);
  return sessions.map((session) =>
    sessionOutput(
      session,
      bookings.filter((booking) => booking.sessionId === session.id),
    ),
  );
};

router.get("/gym/sessions", async (_req, res): Promise<void> => {
  res.json(ListGymSessionsResponse.parse(await loadSessions()));
});

router.post("/gym/sessions", async (req, res): Promise<void> => {
  const parsed = CreateGymSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [session] = await db
    .insert(gymSessionsTable)
    .values({ ...parsed.data, startsAt: new Date(parsed.data.startsAt) })
    .returning();
  res.status(201).json(CreateGymSessionResponse.parse(sessionOutput(session, [])));
});

router.patch("/gym/sessions/:id", async (req, res): Promise<void> => {
  const params = UpdateGymSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateGymSessionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid session details" });
    return;
  }
  const input = parsed.data;
  const currentBookings = await db
    .select({ id: gymSessionBookingsTable.id })
    .from(gymSessionBookingsTable)
    .where(eq(gymSessionBookingsTable.sessionId, params.data.id));
  if (input.capacity !== undefined && input.capacity < currentBookings.length) {
    res.status(400).json({ error: "Capacity cannot be lower than current bookings" });
    return;
  }
  const update: Partial<typeof gymSessionsTable.$inferInsert> = {};
  if (input.name !== undefined) update.name = input.name.trim();
  if (input.startsAt !== undefined) update.startsAt = new Date(input.startsAt);
  if (input.coach !== undefined) update.coach = input.coach;
  if (input.capacity !== undefined) update.capacity = input.capacity;
  const [session] = await db
    .update(gymSessionsTable)
    .set(update)
    .where(eq(gymSessionsTable.id, params.data.id))
    .returning();
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  const bookings = await db
    .select({ memberId: gymSessionBookingsTable.memberId })
    .from(gymSessionBookingsTable)
    .where(eq(gymSessionBookingsTable.sessionId, session.id));
  res.json(UpdateGymSessionResponse.parse(sessionOutput(session, bookings)));
});

router.delete("/gym/sessions/:id", async (req, res): Promise<void> => {
  const params = DeleteGymSessionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [session] = await db
    .delete(gymSessionsTable)
    .where(eq(gymSessionsTable.id, params.data.id))
    .returning({ id: gymSessionsTable.id });
  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }
  res.sendStatus(204);
});

router.post("/gym/sessions/:id/booking", async (req, res): Promise<void> => {
  const params = ChangeGymBookingParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = ChangeGymBookingBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error?.message ?? "Invalid booking request" });
    return;
  }
  const [session] = await db
    .select()
    .from(gymSessionsTable)
    .where(eq(gymSessionsTable.id, params.data.id));
  const [member] = await db
    .select()
    .from(gymMembersTable)
    .where(eq(gymMembersTable.id, parsed.data.memberId));
  if (!session || !member) {
    res.status(404).json({ error: "Session or member not found" });
    return;
  }
  if (parsed.data.action === "book") {
    const mappedMember = memberOutput(member);
    if (mappedMember.status !== "active") {
      res.status(400).json({ error: "Only active members with a valid membership can book" });
      return;
    }
    const currentBookings = await db
      .select({ id: gymSessionBookingsTable.id })
      .from(gymSessionBookingsTable)
      .where(eq(gymSessionBookingsTable.sessionId, session.id));
    const [existing] = await db
      .select()
      .from(gymSessionBookingsTable)
      .where(
        and(
          eq(gymSessionBookingsTable.sessionId, session.id),
          eq(gymSessionBookingsTable.memberId, member.id),
        ),
      );
    if (!existing && currentBookings.length >= session.capacity) {
      res.status(400).json({ error: "This session is full" });
      return;
    }
    if (!existing) {
      await db.insert(gymSessionBookingsTable).values({
        sessionId: session.id,
        memberId: member.id,
      });
    }
  } else {
    await db
      .delete(gymSessionBookingsTable)
      .where(
        and(
          eq(gymSessionBookingsTable.sessionId, session.id),
          eq(gymSessionBookingsTable.memberId, member.id),
        ),
      );
  }
  const bookings = await db
    .select({ memberId: gymSessionBookingsTable.memberId })
    .from(gymSessionBookingsTable)
    .where(eq(gymSessionBookingsTable.sessionId, session.id));
  res.json(ChangeGymBookingResponse.parse(sessionOutput(session, bookings)));
});

router.get("/gym/checkins", async (_req, res): Promise<void> => {
  const checkins = await db
    .select()
    .from(gymCheckinsTable)
    .where(gte(gymCheckinsTable.checkedInAt, startOfToday()))
    .orderBy(desc(gymCheckinsTable.checkedInAt));
  const output = await Promise.all(
    checkins.map(async (checkin) =>
      serializeCheckin(checkin, await memberNameLookup(checkin.memberId)),
    ),
  );
  res.json(ListGymCheckinsResponse.parse(output));
});

router.post("/gym/checkins", async (req, res): Promise<void> => {
  const parsed = CreateGymCheckinBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .select()
    .from(gymMembersTable)
    .where(eq(gymMembersTable.id, parsed.data.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  const mapped = memberOutput(member);
  const allowed = mapped.status === "active" && mapped.days > 0;
  const message = allowed
    ? "Check-in approved"
    : mapped.status === "hold"
      ? "Check-in denied: member is on medical hold"
      : mapped.status === "pending"
        ? "Check-in denied: registration is awaiting approval"
        : "Check-in denied: membership is expired or inactive";
  const [checkin] = await db
    .insert(gymCheckinsTable)
    .values({ memberId: member.id, allowed, message })
    .returning();
  res.status(201).json(
    CreateGymCheckinResponse.parse(serializeCheckin(checkin, member.name)),
  );
});

router.get("/gym/training/logs", async (req, res): Promise<void> => {
  const params = ListGymTrainingLogsQueryParams.safeParse(req.query);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const logs = await db
    .select()
    .from(gymTrainingLogsTable)
    .where(eq(gymTrainingLogsTable.memberId, params.data.memberId))
    .orderBy(desc(gymTrainingLogsTable.loggedAt));
  res.json(ListGymTrainingLogsResponse.parse(logs.map(serializeTrainingLog)));
});

router.post("/gym/training/logs", async (req, res): Promise<void> => {
  const parsed = CreateGymTrainingLogBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .select()
    .from(gymMembersTable)
    .where(eq(gymMembersTable.id, parsed.data.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  if (memberOutput(member).status !== "active") {
    res.status(400).json({ error: "Training is paused for this member" });
    return;
  }
  const [log] = await db
    .insert(gymTrainingLogsTable)
    .values(parsed.data)
    .returning();
  res.status(201).json(
    CreateGymTrainingLogResponse.parse(serializeTrainingLog(log)),
  );
});

router.get("/gym/payments", async (_req, res): Promise<void> => {
  const rows = await db
    .select({ payment: gymPaymentsTable, memberName: gymMembersTable.name })
    .from(gymPaymentsTable)
    .innerJoin(gymMembersTable, eq(gymPaymentsTable.memberId, gymMembersTable.id))
    .orderBy(desc(gymPaymentsTable.paidAt));
  res.json(
    ListGymPaymentsResponse.parse(
      rows.map(({ payment, memberName }) => serializePayment(payment, memberName)),
    ),
  );
});

router.post("/gym/payments", async (req, res): Promise<void> => {
  const parsed = CreateGymPaymentBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [member] = await db
    .select()
    .from(gymMembersTable)
    .where(eq(gymMembersTable.id, parsed.data.memberId));
  if (!member || member.status === "rejected") {
    res.status(404).json({ error: "Member not found" });
    return;
  }
  const planDays = PLAN_DAYS[member.plan] ?? 30;
  const expiresFrom =
    member.membershipEndsAt && member.membershipEndsAt.getTime() > Date.now()
      ? member.membershipEndsAt
      : new Date();
  const newExpiry = new Date(expiresFrom.getTime() + planDays * DAY_MS);
  const [payment] = await db.transaction(async (tx) => {
    const inserted = await tx
      .insert(gymPaymentsTable)
      .values(parsed.data)
      .returning();
    await tx
      .update(gymMembersTable)
      .set({
        membershipEndsAt: newExpiry,
        ...(member.status === "hold" ? {} : { status: "active" }),
      })
      .where(eq(gymMembersTable.id, member.id));
    return inserted;
  });
  res.status(201).json(
    CreateGymPaymentResponse.parse(serializePayment(payment, member.name)),
  );
});

router.post("/gym/registrations", async (req, res): Promise<void> => {
  const parsed = RegisterGymMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const input = parsed.data;
  const [member] = await db
    .insert(gymMembersTable)
    .values({
      name: input.name.trim(),
      type: input.type,
      plan: input.plan,
      status: "pending",
      email: input.email ?? null,
      phone: input.phone ?? null,
      membershipEndsAt: addDays(PLAN_DAYS[input.plan] ?? 30),
    })
    .returning();
  res.status(201).json(
    RegisterGymMemberResponse.parse(memberOutput(member)),
  );
});

export default router;