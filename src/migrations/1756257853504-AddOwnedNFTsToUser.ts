import { MigrationInterface, QueryRunner } from 'typeorm';

export class AddOwnedNFTsToUser1756257853504 implements MigrationInterface {
  name = 'AddOwnedNFTsToUser1756257853504';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      `ALTER TABLE \`users\` ADD \`ownedNFTs\` json NULL`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`users\` DROP COLUMN \`ownedNFTs\``);
  }
}
