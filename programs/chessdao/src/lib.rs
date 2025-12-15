use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, MintTo, Burn, Transfer};

declare_id!("CHESSxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx");

/// ChessDAO Token Program
/// 
/// Smart contract seguro para el token CHESS con:
/// - Supply cap inmutable
/// - Rate limiting
/// - Pausa de emergencia
/// - Eventos on-chain para transparencia
/// - Blacklist de direcciones
/// - Swap integrado con $GAME

#[program]
pub mod chessdao {
    use super::*;

    /// Inicializa el programa con configuración de seguridad
    /// Solo puede ejecutarse una vez
    pub fn initialize(
        ctx: Context<Initialize>,
        max_supply: u64,
        daily_mint_limit: u64,
        swap_fee_basis_points: u16, // 100 = 1%
        chess_to_game_rate: u64,    // 1 CHESS = X $GAME
    ) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        require!(!state.is_initialized, ErrorCode::AlreadyInitialized);
        
        state.is_initialized = true;
        state.authority = ctx.accounts.authority.key();
        state.max_supply = max_supply;
        state.current_supply = 0;
        state.daily_mint_limit = daily_mint_limit;
        state.swap_fee_basis_points = swap_fee_basis_points;
        state.chess_to_game_rate = chess_to_game_rate;
        state.is_paused = false;
        state.created_at = Clock::get()?.unix_timestamp;
        state.last_mint_reset = Clock::get()?.unix_timestamp;
        state.minted_today = 0;
        
        emit!(ProgramInitialized {
            authority: ctx.accounts.authority.key(),
            max_supply,
            daily_mint_limit,
            swap_fee_basis_points,
            chess_to_game_rate,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("ChessDAO Token Program initialized successfully");
        Ok(())
    }

    /// Mint tokens a una dirección
    /// Solo authority puede ejecutar
    /// Respeta supply cap y rate limit
    pub fn mint_tokens(
        ctx: Context<MintTokens>,
        amount: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        // Verificaciones de seguridad
        require!(!state.is_paused, ErrorCode::ProgramPaused);
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        
        // Verificar supply cap
        require!(
            state.current_supply.checked_add(amount).unwrap() <= state.max_supply,
            ErrorCode::SupplyCapExceeded
        );
        
        // Verificar rate limit diario
        let current_time = Clock::get()?.unix_timestamp;
        let day_in_seconds: i64 = 86400;
        
        if current_time - state.last_mint_reset >= day_in_seconds {
            // Nuevo día, resetear contador
            state.minted_today = 0;
            state.last_mint_reset = current_time;
        }
        
        require!(
            state.minted_today.checked_add(amount).unwrap() <= state.daily_mint_limit,
            ErrorCode::DailyMintLimitExceeded
        );
        
        // Verificar blacklist
        require!(
            !is_blacklisted(&ctx.accounts.blacklist, &ctx.accounts.recipient.key()),
            ErrorCode::AddressBlacklisted
        );
        
        // Ejecutar mint
        let cpi_accounts = MintTo {
            mint: ctx.accounts.mint.to_account_info(),
            to: ctx.accounts.recipient_token_account.to_account_info(),
            authority: ctx.accounts.mint_authority.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::mint_to(cpi_ctx, amount)?;
        
        // Actualizar estado
        state.current_supply = state.current_supply.checked_add(amount).unwrap();
        state.minted_today = state.minted_today.checked_add(amount).unwrap();
        
        emit!(TokensMinted {
            recipient: ctx.accounts.recipient.key(),
            amount,
            new_total_supply: state.current_supply,
            minted_today: state.minted_today,
            timestamp: current_time,
        });
        
        msg!("Minted {} tokens to {}", amount, ctx.accounts.recipient.key());
        Ok(())
    }

    /// Burn tokens del usuario
    /// Solo el propietario puede burn sus tokens
    pub fn burn_tokens(
        ctx: Context<BurnTokens>,
        amount: u64,
    ) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        require!(!state.is_paused, ErrorCode::ProgramPaused);
        
        // Ejecutar burn
        let cpi_accounts = Burn {
            mint: ctx.accounts.mint.to_account_info(),
            from: ctx.accounts.user_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::burn(cpi_ctx, amount)?;
        
        // Actualizar supply
        state.current_supply = state.current_supply.checked_sub(amount).unwrap();
        
        emit!(TokensBurned {
            burner: ctx.accounts.user.key(),
            amount,
            new_total_supply: state.current_supply,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Burned {} tokens from {}", amount, ctx.accounts.user.key());
        Ok(())
    }

    /// Swap CHESS tokens por $GAME (off-chain credits)
    /// Registra el swap on-chain para transparencia
    pub fn swap_chess_to_game(
        ctx: Context<SwapChessToGame>,
        chess_amount: u64,
    ) -> Result<()> {
        let state = &ctx.accounts.token_state;
        
        require!(!state.is_paused, ErrorCode::ProgramPaused);
        require!(chess_amount > 0, ErrorCode::InvalidAmount);
        
        // Verificar blacklist
        require!(
            !is_blacklisted(&ctx.accounts.blacklist, &ctx.accounts.user.key()),
            ErrorCode::AddressBlacklisted
        );
        
        // Calcular $GAME a recibir (con fee)
        let gross_game_amount = chess_amount
            .checked_mul(state.chess_to_game_rate)
            .unwrap();
        
        let fee = gross_game_amount
            .checked_mul(state.swap_fee_basis_points as u64)
            .unwrap()
            .checked_div(10000)
            .unwrap();
        
        let net_game_amount = gross_game_amount.checked_sub(fee).unwrap();
        
        // Transferir CHESS al treasury (burn o hold)
        let cpi_accounts = Transfer {
            from: ctx.accounts.user_token_account.to_account_info(),
            to: ctx.accounts.treasury_token_account.to_account_info(),
            authority: ctx.accounts.user.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        
        token::transfer(cpi_ctx, chess_amount)?;
        
        // Registrar swap para que el backend acredite $GAME
        let swap_record = &mut ctx.accounts.swap_record;
        swap_record.user = ctx.accounts.user.key();
        swap_record.from_token = "CHESS".to_string();
        swap_record.to_token = "GAME".to_string();
        swap_record.from_amount = chess_amount;
        swap_record.to_amount = net_game_amount;
        swap_record.fee = fee;
        swap_record.timestamp = Clock::get()?.unix_timestamp;
        swap_record.processed = false;
        
        emit!(SwapExecuted {
            user: ctx.accounts.user.key(),
            from_token: "CHESS".to_string(),
            from_amount: chess_amount,
            to_token: "GAME".to_string(),
            to_amount: net_game_amount,
            fee,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Swap: {} CHESS -> {} $GAME (fee: {})", chess_amount, net_game_amount, fee);
        Ok(())
    }

    /// Pausa de emergencia
    /// Solo authority puede pausar
    pub fn pause(ctx: Context<AdminAction>, reason: String) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        require!(!state.is_paused, ErrorCode::AlreadyPaused);
        
        state.is_paused = true;
        
        emit!(EmergencyPause {
            admin: ctx.accounts.authority.key(),
            reason: reason.clone(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Program PAUSED by authority. Reason: {}", reason);
        Ok(())
    }

    /// Reanudar operaciones
    /// Solo authority puede despausar
    pub fn unpause(ctx: Context<AdminAction>) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        require!(state.is_paused, ErrorCode::NotPaused);
        
        state.is_paused = false;
        
        emit!(ProgramUnpaused {
            admin: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Program UNPAUSED by authority");
        Ok(())
    }

    /// Añadir dirección a blacklist
    pub fn add_to_blacklist(ctx: Context<ManageBlacklist>, address: Pubkey) -> Result<()> {
        let state = &ctx.accounts.token_state;
        let blacklist = &mut ctx.accounts.blacklist;
        
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        require!(blacklist.addresses.len() < 1000, ErrorCode::BlacklistFull);
        
        if !blacklist.addresses.contains(&address) {
            blacklist.addresses.push(address);
            
            emit!(AddressBlacklisted {
                address,
                by: ctx.accounts.authority.key(),
                timestamp: Clock::get()?.unix_timestamp,
            });
            
            msg!("Address {} added to blacklist", address);
        }
        
        Ok(())
    }

    /// Remover dirección de blacklist
    pub fn remove_from_blacklist(ctx: Context<ManageBlacklist>, address: Pubkey) -> Result<()> {
        let state = &ctx.accounts.token_state;
        let blacklist = &mut ctx.accounts.blacklist;
        
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        
        if let Some(index) = blacklist.addresses.iter().position(|&a| a == address) {
            blacklist.addresses.remove(index);
            
            emit!(AddressRemovedFromBlacklist {
                address,
                by: ctx.accounts.authority.key(),
                timestamp: Clock::get()?.unix_timestamp,
            });
            
            msg!("Address {} removed from blacklist", address);
        }
        
        Ok(())
    }

    /// Transferir autoridad a nueva dirección
    /// Requiere confirmación del nuevo authority
    pub fn transfer_authority(ctx: Context<TransferAuthority>, new_authority: Pubkey) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        
        let old_authority = state.authority;
        state.pending_authority = Some(new_authority);
        
        emit!(AuthorityTransferInitiated {
            old_authority,
            new_authority,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Authority transfer initiated to {}", new_authority);
        Ok(())
    }

    /// Confirmar transferencia de autoridad
    pub fn accept_authority(ctx: Context<AcceptAuthority>) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        require!(
            state.pending_authority == Some(ctx.accounts.new_authority.key()),
            ErrorCode::NotPendingAuthority
        );
        
        let old_authority = state.authority;
        state.authority = ctx.accounts.new_authority.key();
        state.pending_authority = None;
        
        emit!(AuthorityTransferred {
            old_authority,
            new_authority: ctx.accounts.new_authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Authority transferred to {}", ctx.accounts.new_authority.key());
        Ok(())
    }

    /// Actualizar configuración (solo parámetros no críticos)
    pub fn update_config(
        ctx: Context<AdminAction>,
        new_daily_limit: Option<u64>,
        new_swap_fee: Option<u16>,
    ) -> Result<()> {
        let state = &mut ctx.accounts.token_state;
        
        require!(ctx.accounts.authority.key() == state.authority, ErrorCode::Unauthorized);
        
        if let Some(limit) = new_daily_limit {
            state.daily_mint_limit = limit;
        }
        
        if let Some(fee) = new_swap_fee {
            require!(fee <= 1000, ErrorCode::FeeTooHigh); // Max 10%
            state.swap_fee_basis_points = fee;
        }
        
        emit!(ConfigUpdated {
            daily_mint_limit: state.daily_mint_limit,
            swap_fee_basis_points: state.swap_fee_basis_points,
            by: ctx.accounts.authority.key(),
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        Ok(())
    }

    // ============= GAME ESCROW MODULE =============
    // Sistema de apuestas on-chain con escrow seguro

    /// Crear una nueva partida con apuesta
    /// El creador deposita tokens en escrow
    pub fn create_game(
        ctx: Context<CreateGame>,
        bet_amount: u64,
        time_control: String,
        game_title: String,
    ) -> Result<()> {
        let state = &ctx.accounts.token_state;
        let game = &mut ctx.accounts.game_match;
        
        require!(!state.is_paused, ErrorCode::ProgramPaused);
        require!(bet_amount > 0, ErrorCode::InvalidAmount);
        require!(time_control.len() <= 10, ErrorCode::InvalidTimeControl);
        require!(game_title.len() <= 50, ErrorCode::TitleTooLong);
        
        // Verificar blacklist
        require!(
            !is_blacklisted(&ctx.accounts.blacklist, &ctx.accounts.player1.key()),
            ErrorCode::AddressBlacklisted
        );
        
        // Transferir tokens al escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.player1_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.player1.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, bet_amount)?;
        
        // Inicializar partida
        game.game_id = ctx.accounts.game_counter.total_games;
        game.player1 = ctx.accounts.player1.key();
        game.player2 = Pubkey::default();
        game.bet_amount = bet_amount;
        game.total_pot = bet_amount;
        game.time_control = time_control.clone();
        game.title = game_title.clone();
        game.status = GameStatus::Waiting;
        game.winner = None;
        game.created_at = Clock::get()?.unix_timestamp;
        game.started_at = 0;
        game.ended_at = 0;
        game.escrow_bump = ctx.bumps.escrow_token_account;
        
        // Incrementar contador de juegos
        ctx.accounts.game_counter.total_games += 1;
        ctx.accounts.game_counter.active_games += 1;
        
        emit!(GameCreated {
            game_id: game.game_id,
            player1: ctx.accounts.player1.key(),
            bet_amount,
            time_control,
            title: game_title,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Game {} created with {} CHESS bet", game.game_id, bet_amount);
        Ok(())
    }

    /// Unirse a una partida existente
    /// Player2 deposita la misma cantidad en escrow
    pub fn join_game(ctx: Context<JoinGame>) -> Result<()> {
        let state = &ctx.accounts.token_state;
        let game = &mut ctx.accounts.game_match;
        
        require!(!state.is_paused, ErrorCode::ProgramPaused);
        require!(game.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        require!(game.player1 != ctx.accounts.player2.key(), ErrorCode::CannotJoinOwnGame);
        
        // Verificar blacklist
        require!(
            !is_blacklisted(&ctx.accounts.blacklist, &ctx.accounts.player2.key()),
            ErrorCode::AddressBlacklisted
        );
        
        // Transferir tokens al escrow
        let cpi_accounts = Transfer {
            from: ctx.accounts.player2_token_account.to_account_info(),
            to: ctx.accounts.escrow_token_account.to_account_info(),
            authority: ctx.accounts.player2.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
        token::transfer(cpi_ctx, game.bet_amount)?;
        
        // Actualizar partida
        game.player2 = ctx.accounts.player2.key();
        game.total_pot = game.bet_amount.checked_mul(2).unwrap();
        game.status = GameStatus::Active;
        game.started_at = Clock::get()?.unix_timestamp;
        
        emit!(GameJoined {
            game_id: game.game_id,
            player1: game.player1,
            player2: ctx.accounts.player2.key(),
            total_pot: game.total_pot,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Player {} joined game {}. Total pot: {} CHESS", 
            ctx.accounts.player2.key(), game.game_id, game.total_pot);
        Ok(())
    }

    /// Resolver partida - distribuir premios
    /// Solo puede ser llamado por authority (backend/oracle)
    pub fn resolve_game(
        ctx: Context<ResolveGame>,
        winner_key: Pubkey,
        is_draw: bool,
    ) -> Result<()> {
        let game = &mut ctx.accounts.game_match;
        let state = &ctx.accounts.token_state;
        
        require!(game.status == GameStatus::Active, ErrorCode::GameNotActive);
        require!(
            ctx.accounts.authority.key() == state.authority,
            ErrorCode::Unauthorized
        );
        
        let current_time = Clock::get()?.unix_timestamp;
        game.ended_at = current_time;
        
        // Calcular fee del DAO (2.5% = 250 basis points)
        let dao_fee_basis_points: u64 = 250;
        let dao_fee = game.total_pot
            .checked_mul(dao_fee_basis_points).unwrap()
            .checked_div(10000).unwrap();
        let prize_pool = game.total_pot.checked_sub(dao_fee).unwrap();
        
        // Seeds para firmar como escrow PDA
        let game_id_bytes = game.game_id.to_le_bytes();
        let seeds = &[
            b"game_escrow",
            game_id_bytes.as_ref(),
            &[game.escrow_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        if is_draw {
            // Empate: cada jugador recibe 50% del prize pool
            game.status = GameStatus::Draw;
            game.winner = None;
            
            let half_prize = prize_pool.checked_div(2).unwrap();
            
            // Transferir a player1
            let cpi_accounts1 = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.player1_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            };
            let cpi_ctx1 = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts1,
                signer_seeds,
            );
            token::transfer(cpi_ctx1, half_prize)?;
            
            // Transferir a player2
            let cpi_accounts2 = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.player2_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            };
            let cpi_ctx2 = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts2,
                signer_seeds,
            );
            token::transfer(cpi_ctx2, half_prize)?;
            
            emit!(GameResolved {
                game_id: game.game_id,
                winner: None,
                is_draw: true,
                prize_amount: half_prize,
                dao_fee,
                timestamp: current_time,
            });
        } else {
            // Victoria: ganador recibe prize pool completo
            require!(
                winner_key == game.player1 || winner_key == game.player2,
                ErrorCode::InvalidWinner
            );
            
            game.status = GameStatus::Completed;
            game.winner = Some(winner_key);
            
            // Determinar cuenta destino
            let winner_token_account = if winner_key == game.player1 {
                ctx.accounts.player1_token_account.to_account_info()
            } else {
                ctx.accounts.player2_token_account.to_account_info()
            };
            
            // Transferir premio al ganador
            let cpi_accounts = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: winner_token_account,
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            };
            let cpi_ctx = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts,
                signer_seeds,
            );
            token::transfer(cpi_ctx, prize_pool)?;
            
            emit!(GameResolved {
                game_id: game.game_id,
                winner: Some(winner_key),
                is_draw: false,
                prize_amount: prize_pool,
                dao_fee,
                timestamp: current_time,
            });
        }
        
        // Transferir fee al treasury
        if dao_fee > 0 {
            let cpi_accounts_fee = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            };
            let cpi_ctx_fee = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts_fee,
                signer_seeds,
            );
            token::transfer(cpi_ctx_fee, dao_fee)?;
        }
        
        // Decrementar juegos activos
        ctx.accounts.game_counter.active_games = ctx.accounts.game_counter
            .active_games.checked_sub(1).unwrap_or(0);
        
        msg!("Game {} resolved. Winner: {:?}, Prize: {}, Fee: {}", 
            game.game_id, game.winner, prize_pool, dao_fee);
        Ok(())
    }

    /// Cancelar partida sin oponente
    /// Solo player1 puede cancelar si nadie se unió
    pub fn cancel_game(ctx: Context<CancelGame>) -> Result<()> {
        let game = &mut ctx.accounts.game_match;
        
        require!(game.status == GameStatus::Waiting, ErrorCode::GameNotWaiting);
        require!(game.player1 == ctx.accounts.player1.key(), ErrorCode::Unauthorized);
        
        // Seeds para firmar como escrow PDA
        let game_id_bytes = game.game_id.to_le_bytes();
        let seeds = &[
            b"game_escrow",
            game_id_bytes.as_ref(),
            &[game.escrow_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Reembolsar a player1
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.player1_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, game.bet_amount)?;
        
        game.status = GameStatus::Cancelled;
        game.ended_at = Clock::get()?.unix_timestamp;
        
        // Decrementar juegos activos
        ctx.accounts.game_counter.active_games = ctx.accounts.game_counter
            .active_games.checked_sub(1).unwrap_or(0);
        
        emit!(GameCancelled {
            game_id: game.game_id,
            player1: game.player1,
            refund_amount: game.bet_amount,
            timestamp: Clock::get()?.unix_timestamp,
        });
        
        msg!("Game {} cancelled. Refunded {} CHESS to player1", game.game_id, game.bet_amount);
        Ok(())
    }

    /// Reclamar fondos por timeout
    /// Si oponente abandona, el otro jugador puede reclamar después de 30 min
    pub fn timeout_claim(ctx: Context<TimeoutClaim>) -> Result<()> {
        let game = &mut ctx.accounts.game_match;
        let claimer = ctx.accounts.claimer.key();
        
        require!(game.status == GameStatus::Active, ErrorCode::GameNotActive);
        require!(
            claimer == game.player1 || claimer == game.player2,
            ErrorCode::NotAPlayer
        );
        
        // Verificar timeout (30 minutos = 1800 segundos)
        let timeout_seconds: i64 = 1800;
        let current_time = Clock::get()?.unix_timestamp;
        require!(
            current_time - game.started_at >= timeout_seconds,
            ErrorCode::TimeoutNotReached
        );
        
        // Calcular fee del DAO
        let dao_fee_basis_points: u64 = 250;
        let dao_fee = game.total_pot
            .checked_mul(dao_fee_basis_points).unwrap()
            .checked_div(10000).unwrap();
        let prize_pool = game.total_pot.checked_sub(dao_fee).unwrap();
        
        // Seeds para firmar como escrow PDA
        let game_id_bytes = game.game_id.to_le_bytes();
        let seeds = &[
            b"game_escrow",
            game_id_bytes.as_ref(),
            &[game.escrow_bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        // Transferir premio al claimer
        let cpi_accounts = Transfer {
            from: ctx.accounts.escrow_token_account.to_account_info(),
            to: ctx.accounts.claimer_token_account.to_account_info(),
            authority: ctx.accounts.escrow_token_account.to_account_info(),
        };
        let cpi_ctx = CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            cpi_accounts,
            signer_seeds,
        );
        token::transfer(cpi_ctx, prize_pool)?;
        
        // Transferir fee al treasury
        if dao_fee > 0 {
            let cpi_accounts_fee = Transfer {
                from: ctx.accounts.escrow_token_account.to_account_info(),
                to: ctx.accounts.treasury_token_account.to_account_info(),
                authority: ctx.accounts.escrow_token_account.to_account_info(),
            };
            let cpi_ctx_fee = CpiContext::new_with_signer(
                ctx.accounts.token_program.to_account_info(),
                cpi_accounts_fee,
                signer_seeds,
            );
            token::transfer(cpi_ctx_fee, dao_fee)?;
        }
        
        game.status = GameStatus::Timeout;
        game.winner = Some(claimer);
        game.ended_at = current_time;
        
        // Decrementar juegos activos
        ctx.accounts.game_counter.active_games = ctx.accounts.game_counter
            .active_games.checked_sub(1).unwrap_or(0);
        
        emit!(GameTimeout {
            game_id: game.game_id,
            claimer,
            prize_amount: prize_pool,
            dao_fee,
            timestamp: current_time,
        });
        
        msg!("Game {} claimed by timeout. Winner: {}, Prize: {}", 
            game.game_id, claimer, prize_pool);
        Ok(())
    }
}

// ============= ACCOUNTS =============

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(
        init,
        payer = authority,
        space = 8 + TokenState::INIT_SPACE,
        seeds = [b"token_state"],
        bump
    )]
    pub token_state: Account<'info, TokenState>,
    
    #[account(
        init,
        payer = authority,
        space = 8 + Blacklist::INIT_SPACE,
        seeds = [b"blacklist"],
        bump
    )]
    pub blacklist: Account<'info, Blacklist>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct MintTokens<'info> {
    #[account(mut, seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(seeds = [b"blacklist"], bump)]
    pub blacklist: Account<'info, Blacklist>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    /// CHECK: Mint authority PDA
    pub mint_authority: AccountInfo<'info>,
    
    /// CHECK: Recipient address
    pub recipient: AccountInfo<'info>,
    
    #[account(mut)]
    pub recipient_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct BurnTokens<'info> {
    #[account(mut, seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(mut)]
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct SwapChessToGame<'info> {
    #[account(seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(seeds = [b"blacklist"], bump)]
    pub blacklist: Account<'info, Blacklist>,
    
    #[account(
        init,
        payer = user,
        space = 8 + SwapRecord::INIT_SPACE,
        seeds = [b"swap", user.key().as_ref(), &Clock::get().unwrap().unix_timestamp.to_le_bytes()],
        bump
    )]
    pub swap_record: Account<'info, SwapRecord>,
    
    #[account(mut)]
    pub user_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub user: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct AdminAction<'info> {
    #[account(mut, seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct ManageBlacklist<'info> {
    #[account(seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(mut, seeds = [b"blacklist"], bump)]
    pub blacklist: Account<'info, Blacklist>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct TransferAuthority<'info> {
    #[account(mut, seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
}

#[derive(Accounts)]
pub struct AcceptAuthority<'info> {
    #[account(mut, seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(mut)]
    pub new_authority: Signer<'info>,
}

// ============= GAME ESCROW ACCOUNTS =============

#[derive(Accounts)]
#[instruction(bet_amount: u64, time_control: String, game_title: String)]
pub struct CreateGame<'info> {
    #[account(seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(seeds = [b"blacklist"], bump)]
    pub blacklist: Account<'info, Blacklist>,
    
    #[account(
        init,
        payer = player1,
        space = 8 + GameMatch::INIT_SPACE,
        seeds = [b"game", &game_counter.total_games.to_le_bytes()],
        bump
    )]
    pub game_match: Account<'info, GameMatch>,
    
    #[account(
        init_if_needed,
        payer = player1,
        space = 8 + GameCounter::INIT_SPACE,
        seeds = [b"game_counter"],
        bump
    )]
    pub game_counter: Account<'info, GameCounter>,
    
    #[account(
        init,
        payer = player1,
        token::mint = mint,
        token::authority = escrow_token_account,
        seeds = [b"game_escrow", &game_counter.total_games.to_le_bytes()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player1_token_account: Account<'info, TokenAccount>,
    
    pub mint: Account<'info, Mint>,
    
    #[account(mut)]
    pub player1: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

#[derive(Accounts)]
pub struct JoinGame<'info> {
    #[account(seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(seeds = [b"blacklist"], bump)]
    pub blacklist: Account<'info, Blacklist>,
    
    #[account(
        mut,
        seeds = [b"game", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub game_match: Account<'info, GameMatch>,
    
    #[account(
        mut,
        seeds = [b"game_escrow", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player2_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player2: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct ResolveGame<'info> {
    #[account(seeds = [b"token_state"], bump)]
    pub token_state: Account<'info, TokenState>,
    
    #[account(
        mut,
        seeds = [b"game", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub game_match: Account<'info, GameMatch>,
    
    #[account(mut, seeds = [b"game_counter"], bump)]
    pub game_counter: Account<'info, GameCounter>,
    
    #[account(
        mut,
        seeds = [b"game_escrow", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player1_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player2_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub authority: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct CancelGame<'info> {
    #[account(
        mut,
        seeds = [b"game", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub game_match: Account<'info, GameMatch>,
    
    #[account(mut, seeds = [b"game_counter"], bump)]
    pub game_counter: Account<'info, GameCounter>,
    
    #[account(
        mut,
        seeds = [b"game_escrow", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player1_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub player1: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct TimeoutClaim<'info> {
    #[account(
        mut,
        seeds = [b"game", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub game_match: Account<'info, GameMatch>,
    
    #[account(mut, seeds = [b"game_counter"], bump)]
    pub game_counter: Account<'info, GameCounter>,
    
    #[account(
        mut,
        seeds = [b"game_escrow", &game_match.game_id.to_le_bytes()],
        bump
    )]
    pub escrow_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub claimer_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub treasury_token_account: Account<'info, TokenAccount>,
    
    #[account(mut)]
    pub claimer: Signer<'info>,
    
    pub token_program: Program<'info, Token>,
}

// ============= STATE =============

#[account]
#[derive(InitSpace)]
pub struct TokenState {
    pub is_initialized: bool,
    pub authority: Pubkey,
    pub pending_authority: Option<Pubkey>,
    pub max_supply: u64,
    pub current_supply: u64,
    pub daily_mint_limit: u64,
    pub minted_today: u64,
    pub last_mint_reset: i64,
    pub swap_fee_basis_points: u16,
    pub chess_to_game_rate: u64,
    pub is_paused: bool,
    pub created_at: i64,
}

#[account]
#[derive(InitSpace)]
pub struct Blacklist {
    #[max_len(1000)]
    pub addresses: Vec<Pubkey>,
}

#[account]
#[derive(InitSpace)]
pub struct SwapRecord {
    pub user: Pubkey,
    #[max_len(10)]
    pub from_token: String,
    #[max_len(10)]
    pub to_token: String,
    pub from_amount: u64,
    pub to_amount: u64,
    pub fee: u64,
    pub timestamp: i64,
    pub processed: bool,
}

// Game Match State
#[account]
#[derive(InitSpace)]
pub struct GameMatch {
    pub game_id: u64,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub bet_amount: u64,
    pub total_pot: u64,
    #[max_len(10)]
    pub time_control: String,
    #[max_len(50)]
    pub title: String,
    pub status: GameStatus,
    pub winner: Option<Pubkey>,
    pub created_at: i64,
    pub started_at: i64,
    pub ended_at: i64,
    pub escrow_bump: u8,
}

// Game Counter (global)
#[account]
#[derive(InitSpace)]
pub struct GameCounter {
    pub total_games: u64,
    pub active_games: u64,
}

// Game Status Enum
#[derive(AnchorSerialize, AnchorDeserialize, Clone, Copy, PartialEq, Eq, InitSpace)]
pub enum GameStatus {
    Waiting,    // Esperando oponente
    Active,     // Partida en curso
    Completed,  // Terminada con ganador
    Draw,       // Empate
    Cancelled,  // Cancelada antes de empezar
    Timeout,    // Terminada por timeout
}

// ============= EVENTS =============

#[event]
pub struct ProgramInitialized {
    pub authority: Pubkey,
    pub max_supply: u64,
    pub daily_mint_limit: u64,
    pub swap_fee_basis_points: u16,
    pub chess_to_game_rate: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensMinted {
    pub recipient: Pubkey,
    pub amount: u64,
    pub new_total_supply: u64,
    pub minted_today: u64,
    pub timestamp: i64,
}

#[event]
pub struct TokensBurned {
    pub burner: Pubkey,
    pub amount: u64,
    pub new_total_supply: u64,
    pub timestamp: i64,
}

#[event]
pub struct SwapExecuted {
    pub user: Pubkey,
    pub from_token: String,
    pub from_amount: u64,
    pub to_token: String,
    pub to_amount: u64,
    pub fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct EmergencyPause {
    pub admin: Pubkey,
    pub reason: String,
    pub timestamp: i64,
}

#[event]
pub struct ProgramUnpaused {
    pub admin: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AddressBlacklisted {
    pub address: Pubkey,
    pub by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AddressRemovedFromBlacklist {
    pub address: Pubkey,
    pub by: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuthorityTransferInitiated {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct AuthorityTransferred {
    pub old_authority: Pubkey,
    pub new_authority: Pubkey,
    pub timestamp: i64,
}

#[event]
pub struct ConfigUpdated {
    pub daily_mint_limit: u64,
    pub swap_fee_basis_points: u16,
    pub by: Pubkey,
    pub timestamp: i64,
}

// Game Escrow Events
#[event]
pub struct GameCreated {
    pub game_id: u64,
    pub player1: Pubkey,
    pub bet_amount: u64,
    pub time_control: String,
    pub title: String,
    pub timestamp: i64,
}

#[event]
pub struct GameJoined {
    pub game_id: u64,
    pub player1: Pubkey,
    pub player2: Pubkey,
    pub total_pot: u64,
    pub timestamp: i64,
}

#[event]
pub struct GameResolved {
    pub game_id: u64,
    pub winner: Option<Pubkey>,
    pub is_draw: bool,
    pub prize_amount: u64,
    pub dao_fee: u64,
    pub timestamp: i64,
}

#[event]
pub struct GameCancelled {
    pub game_id: u64,
    pub player1: Pubkey,
    pub refund_amount: u64,
    pub timestamp: i64,
}

#[event]
pub struct GameTimeout {
    pub game_id: u64,
    pub claimer: Pubkey,
    pub prize_amount: u64,
    pub dao_fee: u64,
    pub timestamp: i64,
}

// ============= HELPERS =============

fn is_blacklisted(blacklist: &Account<Blacklist>, address: &Pubkey) -> bool {
    blacklist.addresses.contains(address)
}

// ============= ERRORS =============

#[error_code]
pub enum ErrorCode {
    #[msg("Program already initialized")]
    AlreadyInitialized,
    
    #[msg("Unauthorized access")]
    Unauthorized,
    
    #[msg("Supply cap would be exceeded")]
    SupplyCapExceeded,
    
    #[msg("Daily mint limit exceeded")]
    DailyMintLimitExceeded,
    
    #[msg("Address is blacklisted")]
    AddressBlacklisted,
    
    #[msg("Program is paused")]
    ProgramPaused,
    
    #[msg("Program is already paused")]
    AlreadyPaused,
    
    #[msg("Program is not paused")]
    NotPaused,
    
    #[msg("Invalid amount")]
    InvalidAmount,
    
    #[msg("Blacklist is full")]
    BlacklistFull,
    
    #[msg("Fee too high (max 10%)")]
    FeeTooHigh,
    
    #[msg("Not the pending authority")]
    NotPendingAuthority,
    
    // Game Escrow Errors
    #[msg("Invalid time control format")]
    InvalidTimeControl,
    
    #[msg("Game title too long (max 50 chars)")]
    TitleTooLong,
    
    #[msg("Game is not in waiting state")]
    GameNotWaiting,
    
    #[msg("Game is not active")]
    GameNotActive,
    
    #[msg("Cannot join your own game")]
    CannotJoinOwnGame,
    
    #[msg("Invalid winner address")]
    InvalidWinner,
    
    #[msg("You are not a player in this game")]
    NotAPlayer,
    
    #[msg("Timeout period has not been reached yet")]
    TimeoutNotReached,
}
