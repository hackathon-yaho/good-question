package com.goodquestion.backend.auth.service;

import com.goodquestion.backend.common.global.ErrorCode;
import com.goodquestion.backend.common.global.exception.BusinessException;
import io.jsonwebtoken.ExpiredJwtException;
import io.jsonwebtoken.JwtException;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.SignatureAlgorithm;
import io.jsonwebtoken.security.Keys;
import lombok.Getter;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;

import java.nio.charset.StandardCharsets;
import java.security.Key;
import java.util.Date;
import java.util.UUID;

/**
 * 해커톤 규모 JWT — access token 하나만 발급한다. refresh token·블랙리스트·재사용 감지는
 * 두지 않는다 (Redis 미사용). 유효기간을 넉넉히 잡아 시연 중 만료를 피한다.
 */
@Component
@Getter
public class JwtTokenProvider {

    private final Key key;
    private final long accessTokenValidityMillis;

    public JwtTokenProvider(
            @Value("${jwt.secret}") String secret,
            @Value("${jwt.access-token-validity}") long accessTokenValidityMillis) {
        byte[] keyBytes = secret.getBytes(StandardCharsets.UTF_8);
        if (keyBytes.length < 32) {
            throw new IllegalStateException("jwt.secret 은 32바이트(자) 이상이어야 합니다.");
        }
        this.key = Keys.hmacShaKeyFor(keyBytes);
        this.accessTokenValidityMillis = accessTokenValidityMillis;
    }

    public String generateAccessToken(UUID parentId) {
        Date now = new Date();
        return Jwts.builder()
                .setSubject(parentId.toString())
                .setIssuedAt(now)
                .setExpiration(new Date(now.getTime() + accessTokenValidityMillis))
                .signWith(key, SignatureAlgorithm.HS256)
                .compact();
    }

    public UUID getParentId(String token) {
        return UUID.fromString(parseClaims(token).getSubject());
    }

    public boolean isValid(String token) {
        try {
            parseClaims(token);
            return true;
        } catch (BusinessException e) {
            return false;
        }
    }

    private io.jsonwebtoken.Claims parseClaims(String token) {
        try {
            return Jwts.parserBuilder().setSigningKey(key).build()
                    .parseClaimsJws(token).getBody();
        } catch (ExpiredJwtException e) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "토큰이 만료되었습니다.");
        } catch (JwtException | IllegalArgumentException e) {
            throw new BusinessException(ErrorCode.UNAUTHORIZED, "유효하지 않은 토큰입니다.");
        }
    }
}
