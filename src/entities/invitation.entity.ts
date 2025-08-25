import {
  Entity,
  Column,
  PrimaryGeneratedColumn,
  CreateDateColumn,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from './user.entity';

@Entity('invitations')
export class Invitation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column('uuid')
  inviterId: string;

  @Column({ unique: true })
  invitationCode: string;

  @Column({ default: false })
  used: boolean;

  @Column('uuid', { nullable: true })
  inviteeId: string;

  @CreateDateColumn()
  createdAt: Date;

  @Column()
  expiredAt: Date;

  @ManyToOne(() => User, (user) => user.sentInvitations)
  @JoinColumn({ name: 'inviterId' })
  inviter: User;

  @ManyToOne(() => User, (user) => user.receivedInvitations, { nullable: true })
  @JoinColumn({ name: 'inviteeId' })
  invitee: User;
}
