import { Controller, Get, Param } from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiParam,
  ApiSecurity,
} from '@nestjs/swagger';
import { NFTService } from './nft.service';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../entities/user.entity';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('NFT')
@Controller('nft')
export class NFTController {
  constructor(private readonly nftService: NFTService) {}

  @Get('my-collection')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Get user NFT collection by planet',
    description:
      'Get Planet NFTs owned by the authenticated user, grouped by planet',
  })
  @ApiResponse({
    status: 200,
    description: 'NFT collection retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          planetName: { type: 'string', example: 'Moon' },
          contractAddress: {
            type: 'string',
            example: '0x0Fd693Fa212F7B42705EcFEC577c8236d45bf1A7',
          },
          planetImage: {
            type: 'string',
            example: 'https://cdn.example.com/moon.jpg',
          },
          nftCount: { type: 'number', example: 3 },
          tokenIds: {
            type: 'array',
            items: { type: 'number' },
            example: [1, 5, 8],
          },
        },
      },
    },
  })
  async getMyNFTCollection(@CurrentUser() user: User) {
    if (!user.walletAddress) {
      return [];
    }
    return await this.nftService.getUserPlanetNFTs(user.walletAddress);
  }

  @Public()
  @Get('collection/:walletAddress')
  @ApiOperation({
    summary: 'Get NFT collection by wallet address',
    description:
      'Get NFTs owned by a specific wallet address with contract addresses and counts',
  })
  @ApiParam({
    name: 'walletAddress',
    description: 'Wallet address to query',
    example: '0x1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'NFT collection retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          contractAddress: {
            type: 'string',
            example: '0x0Fd693Fa212F7B42705EcFEC577c8236d45bf1A7',
          },
          count: { type: 'number', example: 3 },
        },
      },
    },
  })
  async getNFTCollectionByWallet(
    @Param('walletAddress') walletAddress: string,
  ) {
    return await this.nftService.getUserNFTs(walletAddress);
  }

  @Public()
  @Get('collection-by-line/:lineUserId')
  @ApiOperation({
    summary: 'Get NFT collection by LINE user ID',
    description:
      'Get all Planet NFTs owned by a specific LINE user for card display',
  })
  @ApiParam({
    name: 'lineUserId',
    description: 'LINE User ID to query',
    example: 'U1234567890123456789012345678901234567890',
  })
  @ApiResponse({
    status: 200,
    description: 'NFT collection retrieved successfully',
  })
  async getNFTCollectionByLineId(@Param('lineUserId') lineUserId: string) {
    return await this.nftService.getUserPlanetNFTsByLineId(lineUserId);
  }

  @Get('my-stats')
  @ApiSecurity('LineUserID')
  @ApiOperation({
    summary: 'Get user NFT collection statistics',
    description:
      "Get simple statistics about the authenticated user's NFT collection",
  })
  @ApiResponse({
    status: 200,
    description: 'NFT statistics retrieved successfully',
    schema: {
      properties: {
        totalNFTs: { type: 'number', example: 15 },
        uniquePlanetsExplored: { type: 'number', example: 12 },
      },
    },
  })
  async getMyNFTStats(@CurrentUser() user: User) {
    if (!user.walletAddress) {
      return {
        totalNFTs: 0,
        uniquePlanetsExplored: 0,
      };
    }
    return await this.nftService.getUserNFTStats(user.walletAddress);
  }

  @Public()
  @Get('contract-addresses')
  @ApiOperation({
    summary: 'Get all planet NFT contract addresses',
    description: 'Get mapping of planet names to their NFT contract addresses',
  })
  @ApiResponse({
    status: 200,
    description: 'Planet NFT contract addresses retrieved successfully',
    schema: {
      properties: {
        Moon: {
          type: 'string',
          example: '0x0Fd693Fa212F7B42705EcFEC577c8236d45bf1A7',
        },
        Mars: {
          type: 'string',
          example: '0xB399AD2828D4535c0B30F73afbc50Ac96Efe4977',
        },
        Titan: {
          type: 'string',
          example: '0xb228cfCe3DCC0AF6b1B4b70790aD916301E6Bd1F',
        },
        Europa: {
          type: 'string',
          example: '0x674ca2Ca5Cc7481ceaaead587E499398b5eDC8E1',
        },
        Saturn: {
          type: 'string',
          example: '0x6C0D8F6B87dCFD9e1593a0307Bd22464c58f95F3',
        },
      },
    },
  })
  async getPlanetContractAddresses() {
    return await this.nftService.getPlanetContractMapping();
  }

  @Public()
  @Get('contract-address/:planetName')
  @ApiOperation({
    summary: 'Get specific planet NFT contract address',
    description: 'Get NFT contract address for a specific planet',
  })
  @ApiParam({
    name: 'planetName',
    description: 'Planet name',
    example: 'Moon',
  })
  @ApiResponse({
    status: 200,
    description: 'Planet NFT contract address retrieved successfully',
    schema: {
      properties: {
        planetName: { type: 'string', example: 'Moon' },
        contractAddress: {
          type: 'string',
          example: '0x0Fd693Fa212F7B42705EcFEC577c8236d45bf1A7',
        },
      },
    },
  })
  async getPlanetContractAddress(@Param('planetName') planetName: string) {
    const contractAddress =
      await this.nftService.getPlanetContractAddress(planetName);

    if (!contractAddress) {
      return { error: 'Planet not found or no contract address available' };
    }

    return {
      planetName,
      contractAddress,
    };
  }

  @Public()
  @Get('global-stats')
  @ApiOperation({
    summary: 'Get global NFT statistics',
    description:
      'Get global statistics about planet NFTs (total minted, unique holders per planet)',
  })
  @ApiResponse({
    status: 200,
    description: 'Global NFT statistics retrieved successfully',
    schema: {
      type: 'array',
      items: {
        properties: {
          planetName: { type: 'string', example: 'Moon' },
          contractAddress: {
            type: 'string',
            example: '0x0Fd693Fa212F7B42705EcFEC577c8236d45bf1A7',
          },
          totalMinted: { type: 'number', example: 150 },
          uniqueHolders: { type: 'number', example: 85 },
        },
      },
    },
  })
  async getGlobalNFTStats() {
    return await this.nftService.getGlobalNFTStats();
  }
}
