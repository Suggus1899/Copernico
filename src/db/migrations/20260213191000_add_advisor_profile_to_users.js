/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function up(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.text('advisor_profile_specialization_areas');
    table.text('advisor_profile_certification');
    table.text('advisor_profile_bio');
    table.integer('advisor_profile_available').defaultTo(1);
    table.integer('advisor_profile_appointment_duration').defaultTo(60);
  });
}

/**
 * @param { import("knex").Knex } knex
 * @returns { Promise<void> }
 */
export async function down(knex) {
  return knex.schema.alterTable('users', (table) => {
    table.dropColumn('advisor_profile_specialization_areas');
    table.dropColumn('advisor_profile_certification');
    table.dropColumn('advisor_profile_bio');
    table.dropColumn('advisor_profile_available');
    table.dropColumn('advisor_profile_appointment_duration');
  });
}
