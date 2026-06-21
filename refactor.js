const fs = require('fs');

let content = fs.readFileSync('src/lib/actions.ts', 'utf-8');

// Add crypto import and generateId
if (!content.includes('randomUUID')) {
  content = content.replace(
    'import { revalidatePath } from "next/cache";',
    `import { revalidatePath } from "next/cache";\nimport { randomUUID } from "crypto";\n\nconst generateId = (prefix: string) => \`\${prefix}_\${randomUUID().replace(/-/g, '')}\`;`
  );
}

// Fix contactInfo to phone, parentEmail
content = content.replace(/contactInfo: s\.contactInfo \|\| "",/g, `phone: s.phone || "",\n      parentEmail: s.parentEmail || "",`);
content = content.replace(/const contactInfo = formData\.get\("contactInfo"\) as string \|\| null;/g, `const phone = formData.get("phone") as string || null;\n    const parentEmail = formData.get("parentEmail") as string || null;`);
content = content.replace(/contactInfo,/g, `phone,\n        parentEmail,`);

// Add IDs to creates
content = content.replace(/await tx\.tenant\.create\(\{/g, `await tx.tenant.create({\n            data: { id: generateId('tnt'), ...`);
content = content.replace(/return await tx\.user\.create\(\{/g, `return await tx.user.create({\n            data: { id: generateId('usr'), ...`);
content = content.replace(/const newUser = await tx\.user\.create\(\{/g, `const newUser = await tx.user.create({\n            data: { id: generateId('usr'), ...`);

content = content.replace(/await prisma\.studentProfile\.create\(\{\n      data: \{/g, `await prisma.studentProfile.create({\n      data: {\n        id: generateId('stu'),`);
content = content.replace(/universities: \{\n          create: \{/g, `universities: {\n          create: {\n            id: generateId('uni'),`);
content = content.replace(/tasks: \{\n          create: \[\n            \{ title:/g, `tasks: {\n          create: [\n            { id: generateId('tsk'), title:`);
content = content.replace(/, \{ title:/g, `, { id: generateId('tsk'), title:`);

content = content.replace(/const newTask = await prisma\.task\.create\(\{\n      data: \{/g, `const newTask = await prisma.task.create({\n      data: {\n        id: generateId('tsk'),`);
content = content.replace(/await prisma\.milestone\.create\(\{\n      data: \{/g, `await prisma.milestone.create({\n      data: {\n        id: generateId('mil'),`);

content = content.replace(/const newUni = await prisma\.university\.create\(\{\n      data: \{/g, `const newUni = await prisma.university.create({\n      data: {\n        id: generateId('uni'),`);

// For task.createMany in addUniversity
content = content.replace(/const tasksToCreate = template\.items\.map\(\(item: any\) => \(\{/g, `const tasksToCreate = template.items.map((item: any) => ({\n          id: generateId('tsk'),`);
content = content.replace(/data: \[\n          \{/g, `data: [\n          {\n            id: generateId('tsk'),`);
content = content.replace(/,\n          \{\n            studentProfileId/g, `,\n          {\n            id: generateId('tsk'),\n            studentProfileId`);

// ActivityLog
content = content.replace(/await prisma\.activityLog\.create\(\{\n      data: \{/g, `await prisma.activityLog.create({\n      data: {\n        id: generateId('log'),`);

// TaskComment
content = content.replace(/const comment = await prisma\.taskComment\.create\(\{\n      data: \{/g, `const comment = await prisma.taskComment.create({\n      data: {\n        id: generateId('com'),`);

// TaskTemplate
content = content.replace(/const template = await prisma\.taskTemplate\.create\(\{\n      data: \{/g, `const template = await prisma.taskTemplate.create({\n      data: {\n        id: generateId('tpl'),`);
// The template items creation needs IDs too, but since they are nested create arrays, we might need a manual map.
content = content.replace(/items: \{\n          create: items\n        \}/g, `items: {\n          create: items.map(item => ({ id: generateId('tpi'), ...item }))\n        }`);

// createStudentTask
content = content.replace(/const task = await prisma\.task\.create\(\{\n      data: \{/g, `const task = await prisma.task.create({\n      data: {\n        id: generateId('tsk'),`);


// Document Add
// There isn't an addDocument in actions.ts shown so far, but let's check.
content = content.replace(/await prisma\.document\.create\(\{\n      data: \{/g, `await prisma.document.create({\n      data: {\n        id: generateId('doc'),`);

// Add universityId to Milestone and Task creation
// createTask: add universityId
content = content.replace(/export async function createTask\(studentId: string, title: string, dueDateStr\?: string, type: string = "TODO"\) \{/g, `export async function createTask(studentId: string, title: string, dueDateStr?: string, type: string = "TODO", universityId?: string) {`);
content = content.replace(/studentProfileId: studentId,\n        title/g, `studentProfileId: studentId,\n        universityId: universityId || null,\n        title`);

// createMilestone: add universityId
content = content.replace(/export async function createMilestone\(studentId: string, title: string, dateStr: string, type: string\) \{/g, `export async function createMilestone(studentId: string, title: string, dateStr: string, type: string, universityId?: string) {`);
content = content.replace(/studentProfileId: studentId,\n        title,/g, `studentProfileId: studentId,\n        universityId: universityId || null,\n        title,`);

// addUniversity: The tasks should get the universityId
content = content.replace(/studentProfileId: studentId,\n          title: \`【\$\{name\}】\$\{item\.title\}\`,/g, `studentProfileId: studentId,\n          universityId: newUni.id,\n          title: \`【\$\{name\}】\$\{item.title\}\`,`);
content = content.replace(/studentProfileId: studentId,\n            title: \`【\$\{name\}】アドミッション/g, `studentProfileId: studentId,\n            universityId: newUni.id,\n            title: \`【\$\{name\}】アドミッション`);
content = content.replace(/studentProfileId: studentId,\n            title: \`【\$\{name\}】自己推薦書/g, `studentProfileId: studentId,\n            universityId: newUni.id,\n            title: \`【\$\{name\}】自己推薦書`);

fs.writeFileSync('src/lib/actions.ts', content, 'utf-8');
