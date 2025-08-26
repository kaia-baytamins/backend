import { MigrationInterface, QueryRunner } from 'typeorm';

export class UpdatePetTypes1735158600000 implements MigrationInterface {
  name = 'UpdatePetTypes1735158600000';

  public async up(queryRunner: QueryRunner): Promise<void> {
    // Step 1: Delete existing pets with old types (development only!)
    await queryRunner.query(`DELETE FROM pets WHERE type IN ('dog', 'cat')`);

    // Step 2: Update enum to include only new pet types
    await queryRunner.query(`
      ALTER TABLE pets 
      MODIFY COLUMN type ENUM('momoco', 'panlulu', 'hoshitanu', 'mizuru') 
      NOT NULL DEFAULT 'momoco'
    `);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    // Rollback: add back old enum values
    await queryRunner.query(`
      ALTER TABLE pets 
      MODIFY COLUMN type ENUM('dog', 'cat', 'momoco', 'panlulu', 'hoshitanu', 'mizuru') 
      NOT NULL DEFAULT 'dog'
    `);
  }
}
