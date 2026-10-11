// Run with the rollback image's own Prisma client. Read only: never migrate,
// restore an old snapshot or discard data saved after the deployment.
async function checkSchema(db, models, log = console.log) {
  for (const model of models) {
    const key = model.name[0].toLowerCase() + model.name.slice(1);
    if (!db[key]?.findFirst) throw new Error(`Missing Prisma delegate: ${model.name}`);
    // Even an empty table must have every column selected by the old client.
    await db[key].findFirst();
    const table = (model.dbName || model.name).replaceAll('"', '""');
    const columns = await db.$queryRawUnsafe(`PRAGMA table_info("${table}")`);
    const known = new Set(model.fields.filter(field => field.kind !== 'object')
      .map(field => field.dbName || field.name));
    for (const column of columns) {
      // An unknown mandatory column without an SQL default breaks old inserts.
      if (!known.has(column.name) && Number(column.notnull) === 1 && column.dflt_value == null)
        throw new Error(`Incompatible required column: ${model.name}.${column.name}`);
    }
    log(`Rollback schema readable: ${model.name}`);
  }
}

module.exports = { checkSchema };
if (require.main === module) {
  const { PrismaClient, Prisma } = require('@prisma/client');
  const db = new PrismaClient();
  (async () => {
    try {
      await checkSchema(db, Prisma.dmmf.datamodel.models);
      console.log('Rollback schema check passed; database left unchanged.');
    } catch (error) {
      console.error('Rollback schema check failed; application will not start:', error.message);
      process.exitCode = 1;
    } finally {
      await db.$disconnect();
    }
  })();
}
