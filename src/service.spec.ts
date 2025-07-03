import axios from 'axios';
import { KMSVerifier } from './service';

jest.mock('axios');

const mockedAxios = axios as jest.Mocked<typeof axios>;

describe('KMSVerifier', () => {
  let verifier: KMSVerifier;
  const agentURL = 'http://fake-kms-agent.com';

  beforeEach(() => {
    mockedAxios.post.mockClear();
    verifier = new KMSVerifier(agentURL);
  });

  describe('verify 메소드', () => {
    it('검증 성공 시 Guid 인스턴스와 keyName을 반환', async () => {
      const token = 'test-token';
      const ip = '127.0.0.1';
      const mockClientId = 'client-a4f7b3b1-4c2f-4d3a-8e1b-2c3d4e5f6a7b';
      const mockKeyName = 'test-key-name-3333';

      const mockResponse = {
        data: {
          clientId: mockClientId,
          keyName: mockKeyName,
        },
      };

      mockedAxios.post.mockResolvedValue(mockResponse);

      const [clientId, keyName] = await verifier.verify(token, ip);

      expect(mockedAxios.post).toHaveBeenCalledWith(`${agentURL}/verify`, {
        token,
        ip,
      });
      expect(clientId.toString()).toEqual(mockClientId);
      expect(keyName).toEqual(mockKeyName);
    });

    // it('axios post 실패 시 throw', async () => {
    //   const token = 'test-token';
    //   const ip = '127.0.0.1';
    //   const errorMessage = 'Network Error';
    //
    //   mockedAxios.post.mockRejectedValue(new Error(errorMessage));
    //
    //   await expect(verifier.verify(token, ip)).rejects.toThrow(errorMessage);
    // });
  });
});
