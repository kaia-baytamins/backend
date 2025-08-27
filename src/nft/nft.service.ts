import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../entities/user.entity';
import { Planet } from '../entities/planet.entity';

@Injectable()
export class NFTService {
  private readonly logger = new Logger(NFTService.name);

  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Planet)
    private readonly planetRepository: Repository<Planet>,
  ) {}

  /**
   * 지갑 주소로 유저가 소유한 NFT 조회
   * 반환: [{ contractAddress: string, count: number }]
   */
  async getUserNFTs(walletAddress: string): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { walletAddress },
    });

    if (!user || !user.ownedNFTs) {
      // 테스트용 더미 데이터 반환
      if (walletAddress === '0x1234567890123456789012345678901234567890') {
        const contractMapping = await this.getPlanetContractMapping();
        return [
          {
            contractAddress: contractMapping['Moon'],
            count: 3,
          },
          {
            contractAddress: contractMapping['Mars'],
            count: 2,
          },
          {
            contractAddress: contractMapping['Titan'],
            count: 1,
          },
        ];
      }
      return [];
    }

    // 실제 ownedNFTs 데이터를 컨트랙트 주소와 개수로 변환
    const contractMapping = await this.getPlanetContractMapping();
    const result = [];

    for (const [planetId, tokenIds] of Object.entries(user.ownedNFTs)) {
      const contractAddress = contractMapping[planetId];
      if (contractAddress && tokenIds.length > 0) {
        result.push({
          contractAddress,
          count: tokenIds.length,
        });
      }
    }

    return result;
  }

  /**
   * 행성별 NFT 컨트랙트 주소 매핑 조회 (하드코딩)
   */
  async getPlanetContractMapping(): Promise<Record<string, string>> {
    return {
      Moon: '0x0Fd693Fa212F7B42705EcFEC577c8236d45bf1A7',
      Mars: '0xB399AD2828D4535c0B30F73afbc50Ac96Efe4977',
      Titan: '0xb228cfCe3DCC0AF6b1B4b70790aD916301E6Bd1F',
      Europa: '0x674ca2Ca5Cc7481ceaaead587E499398b5eDC8E1',
      Saturn: '0x6C0D8F6B87dCFD9e1593a0307Bd22464c58f95F3',
    };
  }

  /**
   * 특정 행성의 컨트랙트 주소 조회
   */
  async getPlanetContractAddress(planetName: string): Promise<string | null> {
    const mapping = await this.getPlanetContractMapping();
    return mapping[planetName] || null;
  }

  /**
   * 탐사 성공 시 NFT 추가
   */
  async addNFTToUser(walletAddress: string, planetId: string): Promise<void> {
    const user = await this.userRepository.findOne({
      where: { walletAddress },
    });

    if (!user) {
      throw new Error(`User with wallet address ${walletAddress} not found`);
    }

    // ownedNFTs가 없으면 빈 객체로 초기화
    if (!user.ownedNFTs) {
      user.ownedNFTs = {};
    }

    // 해당 행성의 NFT 배열이 없으면 빈 배열로 초기화
    if (!user.ownedNFTs[planetId]) {
      user.ownedNFTs[planetId] = [];
    }

    // 새로운 토큰 ID 생성 (현재 개수 + 1)
    const newTokenId = user.ownedNFTs[planetId].length + 1;
    user.ownedNFTs[planetId].push(newTokenId);

    // 데이터베이스에 저장
    await this.userRepository.save(user);

    this.logger.log(
      `Added NFT token #${newTokenId} for planet ${planetId} to wallet ${walletAddress}`,
    );
  }

  /**
   * 유저가 소유한 행성별 NFT 조회 (상세 정보 포함)
   */
  async getUserPlanetNFTs(walletAddress: string): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { walletAddress },
    });

    if (!user || !user.ownedNFTs) {
      return [];
    }

    const contractMapping = await this.getPlanetContractMapping();
    const result = [];

    for (const [planetId, tokenIds] of Object.entries(user.ownedNFTs)) {
      const contractAddress = contractMapping[planetId];
      if (contractAddress && tokenIds.length > 0) {
        result.push({
          planetId,
          planetName: planetId,
          contractAddress,
          tokenIds,
          count: tokenIds.length,
        });
      }
    }

    return result;
  }

  /**
   * LINE 유저 ID로 행성별 NFT 조회
   */
  async getUserPlanetNFTsByLineId(lineUserId: string): Promise<any[]> {
    const user = await this.userRepository.findOne({
      where: { lineUserId },
    });

    if (!user || !user.ownedNFTs) {
      return [];
    }

    const contractMapping = await this.getPlanetContractMapping();
    const result = [];

    for (const [planetId, tokenIds] of Object.entries(user.ownedNFTs)) {
      const contractAddress = contractMapping[planetId];
      if (contractAddress && tokenIds.length > 0) {
        result.push({
          planetId,
          planetName: planetId,
          contractAddress,
          tokenIds,
          count: tokenIds.length,
        });
      }
    }

    return result;
  }

  /**
   * 유저 NFT 통계 조회
   */
  async getUserNFTStats(walletAddress: string): Promise<any> {
    const user = await this.userRepository.findOne({
      where: { walletAddress },
    });

    if (!user || !user.ownedNFTs) {
      return {
        totalNFTs: 0,
        uniquePlanetsExplored: 0,
      };
    }

    let totalNFTs = 0;
    const uniquePlanetsExplored = Object.keys(user.ownedNFTs).length;

    for (const tokenIds of Object.values(user.ownedNFTs)) {
      totalNFTs += tokenIds.length;
    }

    return {
      totalNFTs,
      uniquePlanetsExplored,
    };
  }

  /**
   * 글로벌 NFT 통계 조회
   */
  async getGlobalNFTStats(): Promise<any[]> {
    const contractMapping = await this.getPlanetContractMapping();

    return Object.entries(contractMapping).map(
      ([planetName, contractAddress]) => ({
        planetName,
        contractAddress,
        totalMinted: 0,
        uniqueHolders: 0,
      }),
    );
  }
}
